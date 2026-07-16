import Button from "@/src/components/button/Button";
import { TextField } from "@/src/components/inputField/InputField";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { Text } from "@/src/components/Text";
import {
  completeCurrentUserProfileSetup,
  createCurrentUserProfile,
  CurrentUserBusinessInvitation,
  declineCurrentUserBusinessInvitation,
  getCurrentUserBusinessInvitations,
} from "@/src/services/active.profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

type ProfileRole = "buyer" | "seller";

export default function CreateProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ setup?: string }>();
  const { state, profiles, activeProfile, refreshProfiles } = useActiveProfile();
  const isRepair = params.setup === "true" && state === "setup_required";
  const hasProfiles = profiles.length > 0;
  const requiresBusinessRepair =
    isRepair && activeProfile?.setupStatus === "missing_business";
  const s = useMemo(
    () =>
      createStyles(
        t,
        insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT,
        insets.bottom
      ),
    [insets.bottom, insets.top, t]
  );
  const [name, setName] = useState(
    isRepair ? activeProfile?.profile.name ?? "" : ""
  );
  const [idDocument, setIdDocument] = useState(
    isRepair ? activeProfile?.profile.id_document ?? "" : ""
  );
  const [role, setRole] = useState<ProfileRole>(
    activeProfile?.role === "seller" || requiresBusinessRepair ? "seller" : "buyer"
  );
  const [businessName, setBusinessName] = useState("");
  const [businessIdDocument, setBusinessIdDocument] = useState("");
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<CurrentUserBusinessInvitation[]>(
    []
  );
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void getCurrentUserBusinessInvitations().then((result) => {
      if (active && result.ok) setInvitations(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (params.setup === "true" && state === "ready") {
      router.replace("/");
    }
  }, [params.setup, state]);

  const sellerNeedsInvitation = role === "seller" && hasProfiles && !isRepair;
  const sellerCreatesBusiness =
    role === "seller" && !invitationId && !sellerNeedsInvitation;

  const save = async () => {
    if (createdProfileId) {
      setIsSaving(true);
      const activated = await refreshProfiles(createdProfileId);
      setIsSaving(false);
      if (!activated) {
        showError(
          "Perfil creado",
          "No pudimos activarlo todavía. Intenta nuevamente."
        );
        return;
      }
      showSuccess("Perfil listo", "Este perfil ahora está activo.");
      router.replace("/");
      return;
    }

    if (!isRepair && (!name.trim() || !idDocument.trim())) {
      showError("Faltan datos", "Completa el nombre y la identificación.");
      return;
    }
    if (sellerNeedsInvitation && !invitationId) {
      showError(
        "Invitación requerida",
        "Para crear otro perfil vendedor debes aceptar una invitación de negocio."
      );
      return;
    }
    if (
      sellerCreatesBusiness &&
      (!businessName.trim() || !businessIdDocument.trim())
    ) {
      showError("Faltan datos", "Completa la información del negocio.");
      return;
    }

    setIsSaving(true);
    const result =
      isRepair && activeProfile
        ? await completeCurrentUserProfileSetup(activeProfile.profile.id, {
            role,
            businessName,
            businessIdDocument,
            invitationId,
          })
        : await createCurrentUserProfile({
            name,
            idDocument,
            role,
            businessName,
            businessIdDocument,
            invitationId,
          });
    if (!result.ok) {
      setIsSaving(false);
      showError("No se pudo guardar el perfil", result.error.message);
      return;
    }

    setCreatedProfileId(result.data.id);
    const activated = await refreshProfiles(result.data.id);
    setIsSaving(false);
    if (!activated) {
      showError(
        "Perfil creado",
        "No pudimos activarlo todavía. Intenta nuevamente."
      );
      return;
    }
    setCreatedProfileId(null);
    showSuccess("Perfil listo", "Este perfil ahora está activo.");
    router.replace("/");
  };

  const declineInvitation = async () => {
    if (!invitationId) return;
    const result = await declineCurrentUserBusinessInvitation(invitationId);
    if (!result.ok) {
      showError("No se pudo rechazar la invitación", result.error.message);
      return;
    }
    setInvitations((current) =>
      current.filter((invitation) => invitation.id !== invitationId)
    );
    setInvitationId(null);
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="title">
          {isRepair ? "Completar perfil" : "Crear perfil"}
        </Text>
        <Text variant="body" color="stateAnulated">
          Todos tus perfiles usan el mismo número y la misma sesión.
        </Text>

        {!isRepair ? (
          <>
            <TextField
              label="Nombre"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <TextField
              label="Identificación"
              value={idDocument}
              onChangeText={setIdDocument}
            />
          </>
        ) : null}

        {!requiresBusinessRepair && (!isRepair || activeProfile?.role == null) ? (
          <View style={s.roleRow}>
            <View style={s.roleButton}>
              <Button
                title="Comprador"
                variant={role === "buyer" ? "dark" : "white"}
                onPress={() => {
                  setRole("buyer");
                  setInvitationId(null);
                }}
              />
            </View>
            <View style={s.roleButton}>
              <Button
                title="Vendedor"
                variant={role === "seller" ? "dark" : "white"}
                onPress={() => setRole("seller")}
              />
            </View>
          </View>
        ) : null}

        {role === "seller" && invitations.length > 0 ? (
          <View style={s.section}>
            <Text variant="subtitle">Invitaciones disponibles</Text>
            {invitations.map((invitation) => {
              const selected = invitation.id === invitationId;
              return (
                <Pressable
                  key={invitation.id}
                  style={[s.invitation, selected && s.invitationSelected]}
                  onPress={() => setInvitationId(invitation.id)}
                >
                  <Text variant="subtitle">{invitation.businessName}</Text>
                  <Text variant="small" color="stateAnulated">
                    {invitation.inviterProfileName
                      ? "Invitado por " + invitation.inviterProfileName
                      : "Invitación de negocio"}
                  </Text>
                </Pressable>
              );
            })}
            {invitationId ? (
              <Button
                title="Rechazar invitación"
                variant="white"
                onPress={() => void declineInvitation()}
              />
            ) : null}
          </View>
        ) : null}

        {sellerCreatesBusiness ? (
          <>
            <TextField
              label="Nombre del negocio"
              value={businessName}
              onChangeText={setBusinessName}
            />
            <TextField
              label="Identificación del negocio"
              value={businessIdDocument}
              onChangeText={setBusinessIdDocument}
            />
          </>
        ) : null}

        {sellerNeedsInvitation && invitations.length === 0 ? (
          <Text variant="body" color="stateAnulated">
            No tienes invitaciones pendientes. La persona propietaria del negocio
            debe invitar tu número de Luppit.
          </Text>
        ) : null}

        <Button
          title={
            createdProfileId
              ? "Reintentar activación"
              : isRepair
                ? "Completar perfil"
                : "Crear y activar"
          }
          loading={isSaving}
          disabled={sellerNeedsInvitation && !invitationId}
          onPress={() => void save()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(t: Theme, topInset: number, bottomInset: number) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    content: {
      paddingTop: topInset + t.spacing.md,
      paddingBottom: bottomInset + t.spacing.xl,
      gap: t.spacing.md,
    },
    roleRow: {
      flexDirection: "row",
      gap: t.spacing.sm,
    },
    roleButton: {
      flex: 1,
    },
    section: {
      gap: t.spacing.sm,
    },
    invitation: {
      padding: t.spacing.md,
      gap: t.spacing.xs,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borders.md,
      backgroundColor: t.colors.backgroudWhite,
    },
    invitationSelected: {
      borderColor: t.colors.primary,
    },
  });
}
