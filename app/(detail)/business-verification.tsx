import Button from "@/src/components/button/Button";
import FilePicker, { SelectedFile } from "@/src/components/filePicker/FilePicker";
import { Icon } from "@/src/components/Icon";
import { TextField } from "@/src/components/inputField/InputField";
import LoadingState from "@/src/components/loading/LoadingState";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { getProfilePictureSource } from "@/src/components/profile/ProfilePicture";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { SupportContactRow } from "@/src/components/support/SupportContactRow";
import { Text } from "@/src/components/Text";
import { isProfileEmailSetupComplete } from "@/src/components/navbar/useEmailSetupGate";
import {
  BusinessVerification,
  getCurrentBusinessVerification,
  submitCurrentBusinessVerification,
} from "@/src/services/business-verification.service";
import { openPopup } from "@/src/services/popup.service";
import { getBusinessVerificationRefreshMessage } from "@/src/services/business-verification.helpers";
import { Theme, useTheme } from "@/src/themes";
import { showError, showInfo, showSuccess } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

export default function BusinessVerificationScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(
    () => createStyles(t, insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT, insets.bottom),
    [insets.bottom, insets.top, t],
  );
  const { activeProfile, profiles, refreshProfiles, switchProfile } = useActiveProfile();
  const [verification, setVerification] = useState<BusinessVerification | null>(null);
  const [rnpNumber, setRnpNumber] = useState("");
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef<{ profileId: string; showProgress: boolean } | null>(null);
  const verificationRef = useRef<BusinessVerification | null>(null);

  const profileId = activeProfile?.profile.id ?? null;
  const profileIdRef = useRef(profileId);
  profileIdRef.current = profileId;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    requestRef.current = null;
    verificationRef.current = null;
    setVerification(null);
    setRnpNumber("");
    setFiles([]);
    setIsLoading(true);
    setIsRefreshing(false);
    setLoadError(null);
  }, [profileId]);

  const load = useCallback(async (showProgress = false) => {
    if (!profileId) return;
    if (requestRef.current?.profileId === profileId) {
      if (showProgress) {
        requestRef.current.showProgress = true;
        setIsRefreshing(true);
      }
      return;
    }
    const request = { profileId, showProgress };
    requestRef.current = request;
    const isCurrent = () => mountedRef.current &&
      profileIdRef.current === profileId && requestRef.current === request;
    const previous = verificationRef.current;
    if (showProgress) setIsRefreshing(true);
    setLoadError(null);
    try {
      const result = await getCurrentBusinessVerification(profileId);
      if (!isCurrent()) return;
      if (!result.ok) {
        setLoadError("No pudimos actualizar el estado. Intentá de nuevo.");
        showError("No pudimos actualizar el estado", "Intentá de nuevo.");
        return;
      }

      verificationRef.current = result.data;
      setVerification(result.data);
      setRnpNumber((current) => current || result.data.rnpNumber || "");
      if (request.showProgress) {
        const message = getBusinessVerificationRefreshMessage(previous, result.data);
        if (result.data.status === "APPROVED" && previous?.status !== "APPROVED") {
          showSuccess(message);
        } else {
          showInfo(message);
        }
      }
      if (result.data.status === "APPROVED") {
        const activated = await refreshProfiles(profileId);
        if (!isCurrent()) return;
        if (activated) {
          router.replace("/(tabs)");
        } else {
          setLoadError("Tu negocio está aprobado. No pudimos actualizar tu perfil. Intentá de nuevo.");
          showError("No pudimos actualizar tu perfil", "Tu negocio sigue aprobado. Intentá de nuevo.");
        }
      }
    } catch {
      if (!isCurrent()) return;
      setLoadError("No pudimos actualizar el estado. Intentá de nuevo.");
      showError("No pudimos actualizar el estado", "Intentá de nuevo.");
    } finally {
      if (isCurrent()) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      if (requestRef.current === request) requestRef.current = null;
    }
  }, [profileId, refreshProfiles]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => {};
  }, [load]));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => subscription.remove();
  }, [load]);

  if (!activeProfile || isLoading) {
    return <LoadingState label="Consultando la verificación..." />;
  }

  if (!verification) {
    return (
      <View style={s.content}>
        <Text align="center">{loadError || "No pudimos consultar la solicitud."}</Text>
        <Button
          title={isRefreshing ? "Actualizando..." : "Reintentar"}
          loading={isRefreshing}
          onPress={() => void load(true)}
        />
        <SupportContactRow />
      </View>
    );
  }

  const hasEmail = isProfileEmailSetupComplete(activeProfile.profile);
  const canSubmit = verification.status === null || verification.status === "NEEDS_ACTION";
  const openProfileSwitcher = () => {
    openPopup({
      type: "profileSwitcher",
      profiles: profiles.map((profile) => {
        const picture = profile.role === "buyer"
          ? getProfilePictureSource(profile)
          : { imagePath: null, imageUrl: null };

        return {
          id: profile.profile.id,
          title: profile.profile.name,
          subtitle: profile.role === "seller"
            ? profile.businessName || "Negocio en revisión"
            : "Comprador",
          imagePath: picture.imagePath,
          imageUrl: picture.imageUrl,
          unreadNotificationCount: profile.unreadCount,
          isActive: profile.profile.id === activeProfile.profile.id,
          onPress: async () => {
            await switchProfile(profile.profile.id);
          },
        };
      }),
    });
  };
  const submit = async () => {
    if (!hasEmail) {
      router.push({ pathname: "/(modal)/email-setup", params: { title: "Verificar correo" } });
      return;
    }
    if (!rnpNumber.trim() || files.length === 0) {
      showError("Completá el número RNP y adjuntá al menos un documento.");
      return;
    }
    setIsSubmitting(true);
    const result = await submitCurrentBusinessVerification({
      userId: activeProfile.profile.user_id!,
      profileId: activeProfile.profile.id,
      rnpNumber,
      files,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      showError("No pudimos enviar la solicitud", result.error.message);
      return;
    }
    verificationRef.current = result.data;
    setVerification(result.data);
    setFiles([]);
    showSuccess("Solicitud enviada", "Nuestro equipo la revisará en un máximo de dos días hábiles.");
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.header}>
        <View style={s.icon}><Icon name="house" size={24} color={t.colors.primary} /></View>
        <Text variant="title" align="center">Verificá tu negocio</Text>
        <Text color="textMedium" align="center" style={s.description}>
          Enviá la información para que nuestro equipo pueda revisarla.
        </Text>
      </View>

      {!hasEmail ? (
        <View style={s.surface}>
          <Text variant="subtitle">Primero verificá tu correo</Text>
          <Text color="textMedium">Lo usaremos para comunicarte el resultado de la revisión.</Text>
          <Button
            title="Verificar correo"
            onPress={() => router.push({
              pathname: "/(modal)/email-setup",
              params: { title: "Verificar correo" },
            })}
          />
        </View>
      ) : verification.status === "PENDING" ? (
        <View style={s.surface}>
          <Text variant="subtitle">Solicitud en revisión</Text>
          <Text color="textMedium">
            Te avisaremos por correo y dentro de la app. La revisión puede tardar hasta dos días hábiles.
          </Text>
          <Button
            title={isRefreshing ? "Consultando..." : "Consultar estado"}
            variant="white"
            loading={isRefreshing}
            onPress={() => void load(true)}
          />
          <Text variant="small" color="textMedium">
            Tu solicitud ya fue enviada. Este botón consulta si hay novedades; no vuelve a enviar tus documentos.
          </Text>
        </View>
      ) : verification.status === "REJECTED" ? (
        <View style={s.surface}>
          <Text variant="subtitle">No pudimos aprobar la solicitud</Text>
          <Text color="textMedium">
            {verification.safeMessage || "Contactá a soporte si necesitás ayuda."}
          </Text>
        </View>
      ) : canSubmit ? (
        <>
          {verification.status === "NEEDS_ACTION" ? (
            <View style={s.surface}>
              <Text variant="subtitle">Necesitamos más información</Text>
              <Text color="textMedium">{verification.safeMessage}</Text>
            </View>
          ) : null}

          <View style={s.surface}>
            <TextField
              label="Número de certificación RNP (SICOP)"
              value={rnpNumber}
              onChangeText={setRnpNumber}
              autoCapitalize="characters"
              accessibilityHint="RNP significa Registro Nacional de Proveedores en SICOP. Ingresa el número que aparece en tu certificación vigente"
              editable={!isSubmitting}
            />
            <Text variant="small" color="textMedium">
              RNP significa Registro Nacional de Proveedores en SICOP. Escribí el número que aparece en tu certificación vigente y adjuntá esa certificación como respaldo. Si no sabés cuál corresponde, contactá a soporte antes de enviar.
            </Text>
            <FilePicker
              label="Documentos de respaldo"
              mode="files"
              accept={["application/pdf", "image/jpeg", "image/png"]}
              maxFiles={5}
              disabled={isSubmitting}
              value={files}
              onChange={setFiles}
            />
            <Text variant="small" color="textMedium">
              Adjuntá documentos que permitan verificar el negocio y tu relación con él. Nuestro equipo revisará la información y podrá solicitar documentos adicionales.
            </Text>
            <Text variant="small" color="stateAnulated">PDF, JPG o PNG · máximo 5 archivos de 5 MB.</Text>
          </View>

          <Button title="Enviar a revisión" loading={isSubmitting} onPress={() => void submit()} />
        </>
      ) : null}

      {(loadError || isRefreshing) && verification.status !== "PENDING" ? (
        <View style={s.surface}>
          <Text color="textMedium">{loadError || "Actualizando el estado de tu solicitud..."}</Text>
          <Button
            title={isRefreshing ? "Actualizando..." : "Reintentar"}
            variant="white"
            loading={isRefreshing}
            onPress={() => void load(true)}
          />
        </View>
      ) : null}

      <View style={s.surface}>
        {profiles.length > 1 ? (
          <Button
            title="Cambiar perfil"
            variant="white"
            onPress={openProfileSwitcher}
          />
        ) : null}
        <Button
          title="Configuración de la cuenta"
          variant="white"
          onPress={() => router.push({
            pathname: "/(detail)/account-settings",
            params: { title: "Configuración", hideMenu: "true" },
          })}
        />
        <SupportContactRow />
      </View>
    </ScrollView>
  );
}

function createStyles(t: Theme, topInset: number, bottomInset: number) {
  return StyleSheet.create({
    content: {
      paddingTop: topInset + t.spacing.lg,
      paddingBottom: bottomInset + t.spacing.xl,
      gap: t.spacing.lg,
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
    },
    header: { alignItems: "center", gap: t.spacing.sm },
    icon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      ...createRoundedSurfaceStyle(t),
    },
    description: { maxWidth: 360 },
    surface: { ...createRoundedSurfaceStyle(t), padding: t.spacing.md, gap: t.spacing.md },
  });
}
