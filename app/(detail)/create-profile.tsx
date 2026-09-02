import Button from "@/src/components/button/Button";
import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import { Icon } from "@/src/components/Icon";
import { TextField } from "@/src/components/inputField/InputField";
import LoadingState from "@/src/components/loading/LoadingState";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  createCurrentUserProfile,
  CurrentUserBusinessInvitation,
  declineCurrentUserBusinessInvitation,
  getCurrentUserBusinessInvitations,
} from "@/src/services/active.profile.service";
import {
  beginCurrentUserBuyerOnboarding,
  beginCurrentUserSellerOnboarding,
  createCurrentUserBuyerProfileFromVerifiedIdentity,
} from "@/src/services/identity-verification.service";
import {
  continueIdentityVerificationAfterOnboarding,
  getBuyerProfileCreationMode,
} from "@/src/services/identity-verification.helpers";
import { openPopup } from "@/src/services/popup.service";
import { Theme, useTheme } from "@/src/themes";
import {
  COSTA_RICA_PERSONAL_ID_ERROR,
  COSTA_RICA_PERSONAL_ID_LENGTH,
  isValidCostaRicaPersonalId,
} from "@/src/utils/costaRicaIdDocument";
import {
  showError,
  showMissingFields,
  showSuccess,
} from "@/src/utils/useToast";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

type ProfileRole = "buyer" | "seller";
type SellerLinkMode = "business" | "invitation";

function formatInvitationDate(value: string) {
  return new Date(value).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CreateProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ setup?: string }>();
  const { state, activeProfile, profiles, refreshProfiles } = useActiveProfile();
  const isRepair = params.setup === "true" && state === "setup_required";
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
  const hasBuyerProfile = profiles.some((profile) => profile.role === "buyer");
  const accountIdentityStatus =
    activeProfile?.identityStatus ?? profiles[0]?.identityStatus ?? "NOT_STARTED";
  const buyerCreationMode = getBuyerProfileCreationMode(
    hasBuyerProfile,
    accountIdentityStatus,
  );
  const [name, setName] = useState(
    isRepair ? activeProfile?.profile.name ?? "" : ""
  );
  const [idDocument, setIdDocument] = useState(
    isRepair ? activeProfile?.profile.id_document ?? "" : ""
  );
  const [role, setRole] = useState<ProfileRole>(
    activeProfile?.role === "seller" || requiresBusinessRepair || hasBuyerProfile
      ? "seller"
      : "buyer"
  );
  const [sellerLinkMode, setSellerLinkMode] =
    useState<SellerLinkMode | null>(null);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<CurrentUserBusinessInvitation[]>(
    []
  );
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [hasInvitationLoadError, setHasInvitationLoadError] = useState(false);
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);
  const [didSubmit, setDidSubmit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadInvitations = useCallback(async () => {
    setIsLoadingInvitations(true);
    setHasInvitationLoadError(false);
    const result = await getCurrentUserBusinessInvitations();
    if (!result.ok) {
      setHasInvitationLoadError(true);
      setIsLoadingInvitations(false);
      return;
    }
    setInvitations(result.data);
    setInvitationId((current) =>
      result.data.some((invitation) => invitation.id === current) ? current : null
    );
    setIsLoadingInvitations(false);
  }, []);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  useEffect(() => {
    if (!isRepair && buyerCreationMode === "unavailable") {
      setRole("seller");
    }
  }, [buyerCreationMode, isRepair]);

  const sellerUsesInvitation =
    role === "seller" && sellerLinkMode === "invitation";
  const selectedInvitation =
    invitations.find((invitation) => invitation.id === invitationId) ?? null;
  const usesVerifiedBuyerIdentity =
    !isRepair && role === "buyer" && buyerCreationMode === "verified";
  const requiresBuyerIdentityVerification =
    !isRepair && role === "buyer" && buyerCreationMode === "identity_required";
  const usesManagedBuyerIdentity =
    usesVerifiedBuyerIdentity || requiresBuyerIdentityVerification;
  const idDocumentError =
    didSubmit &&
    !isRepair &&
    !usesManagedBuyerIdentity &&
    idDocument.trim().length > 0 &&
    !isValidCostaRicaPersonalId(idDocument)
      ? COSTA_RICA_PERSONAL_ID_ERROR
      : "";

  const showProfileReady = () => {
    if (selectedInvitation) {
      showSuccess(
        `Te uniste a ${selectedInvitation.businessName}`,
        "Tu perfil vendedor ya está vinculado al negocio."
      );
      return;
    }
    showSuccess("Perfil listo", "Este perfil ahora está activo.");
  };

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
      showProfileReady();
      router.replace("/(tabs)");
      return;
    }

    setDidSubmit(true);
    const missingFields: string[] = [];
    if (
      role === "buyer" &&
      !isRepair &&
      !usesManagedBuyerIdentity &&
      !name.trim()
    ) {
      missingFields.push("nombre");
    }
    if (
      role === "buyer" &&
      !isRepair &&
      !usesManagedBuyerIdentity &&
      !idDocument.trim()
    ) {
      missingFields.push("identificación personal");
    }
    if (role === "seller" && !sellerLinkMode) {
      missingFields.push("vinculación del negocio");
    }
    if (sellerUsesInvitation && !invitationId) {
      missingFields.push("invitación de negocio");
    }
    showMissingFields(missingFields);
    if (missingFields.length > 0) return;

    if (
      !isRepair &&
      role === "buyer" &&
      !usesManagedBuyerIdentity &&
      !isValidCostaRicaPersonalId(idDocument)
    ) {
      return;
    }
    if (requiresBuyerIdentityVerification) {
      setIsSaving(true);
      const onboarding = await beginCurrentUserBuyerOnboarding();
      if (!onboarding.ok) {
        setIsSaving(false);
        showError("No se pudo iniciar la verificación", onboarding.error.message);
        return;
      }
      const continued = await continueIdentityVerificationAfterOnboarding({
        refreshProfiles,
        navigate: () => router.replace("/(auth)/identity-verification"),
      });
      setIsSaving(false);
      if (!continued) {
        showError(
          "Verificación iniciada",
          "No pudimos abrirla todavía. Intenta nuevamente."
        );
      }
      return;
    }

    setIsSaving(true);
    if (role === "seller") {
      const onboarding = await beginCurrentUserSellerOnboarding(
        sellerUsesInvitation ? invitationId : null,
      );
      if (!onboarding.ok) {
        setIsSaving(false);
        showError("No se pudo iniciar la verificación", onboarding.error.message);
        return;
      }
      if (onboarding.data.profileId) {
        const activated = await refreshProfiles(onboarding.data.profileId);
        setIsSaving(false);
        if (activated) router.replace("/(tabs)");
        return;
      }
      const continued = await continueIdentityVerificationAfterOnboarding({
        refreshProfiles,
        navigate: () => router.replace("/(auth)/identity-verification"),
      });
      setIsSaving(false);
      if (!continued) {
        showError(
          "Verificación iniciada",
          "No pudimos abrirla todavía. Intenta nuevamente."
        );
      }
      return;
    }

    const result = usesVerifiedBuyerIdentity
      ? await createCurrentUserBuyerProfileFromVerifiedIdentity()
      : await createCurrentUserProfile({ name, idDocument, role });
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
    showProfileReady();
    router.replace("/(tabs)");
  };

  const declineInvitation = async (invitation: CurrentUserBusinessInvitation) => {
    const result = await declineCurrentUserBusinessInvitation(invitation.id);
    if (!result.ok) {
      showError("No se pudo rechazar la invitación", result.error.message);
      return false;
    }
    setInvitations((current) =>
      current.filter((currentInvitation) => currentInvitation.id !== invitation.id)
    );
    if (invitationId === invitation.id) setInvitationId(null);
    showSuccess("Invitación rechazada");
    return true;
  };

  const openDeclineInvitation = (invitation: CurrentUserBusinessInvitation) => {
    openPopup({
      type: "summary",
      title: "Rechazar invitación",
      icon: "x-circle",
      description: `Esta invitación dejará de estar disponible y no te unirás a ${invitation.businessName}. El administrador principal podrá invitarte de nuevo después.`,
      actions: [
        {
          id: "keep-invitation",
          label: "Conservar",
          icon: "arrow-left",
        },
        {
          id: "decline-invitation",
          label: "Rechazar",
          icon: "x-circle",
          textColorKey: "error",
          iconColorKey: "error",
          onPress: () => declineInvitation(invitation),
        },
      ],
    });
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!requiresBusinessRepair &&
        buyerCreationMode !== "unavailable" &&
        (!isRepair || activeProfile?.role == null) ? (
          <GroupedListSection title="Tipo de perfil">
            <GroupedListRow
              icon="user"
              label="Comprador"
              description="Para solicitar productos y comparar ofertas."
              showChevron={false}
              rightAccessory={
                <SelectionIndicator selected={role === "buyer"} styles={s} />
              }
              onPress={() => {
                setRole("buyer");
                setSellerLinkMode(null);
                setInvitationId(null);
              }}
            />
            <GroupedListRow
              icon="handshake"
              label="Vendedor"
              description="Para vender desde un negocio propio o mediante una invitación."
              descriptionMaxLines={3}
              showChevron={false}
              showSeparator={false}
              rightAccessory={
                <SelectionIndicator selected={role === "seller"} styles={s} />
              }
              onPress={() => {
                if (role !== "seller") {
                  setSellerLinkMode(null);
                  setInvitationId(null);
                }
                setRole("seller");
              }}
            />
          </GroupedListSection>
        ) : null}

        {!isRepair && role === "buyer" && usesManagedBuyerIdentity ? (
          <GroupedListSection title="Datos del perfil">
            <GroupedListRow
              icon="shield-check"
              label={
                usesVerifiedBuyerIdentity
                  ? "Identidad verificada"
                  : "Verificación de identidad"
              }
              description={
                usesVerifiedBuyerIdentity
                  ? "Activaremos tu perfil comprador con tus datos verificados."
                  : "Verifica tu identidad para activar tu perfil comprador."
              }
              descriptionMaxLines={3}
              showChevron={false}
              showSeparator={false}
            />
          </GroupedListSection>
        ) : !isRepair && role === "buyer" ? (
          <FormSection
            title="Datos del perfil"
            helper="Usará el mismo número y la misma sesión."
            styles={s}
          >
            <TextField
              label="Nombre"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              baseContainerStyle={s.inputContainer}
            />
            <TextField
              label="Identificación"
              value={idDocument}
              onChangeText={setIdDocument}
              hasError={Boolean(idDocumentError)}
              error={idDocumentError}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={COSTA_RICA_PERSONAL_ID_LENGTH}
              baseContainerStyle={s.inputContainer}
            />
          </FormSection>
        ) : null}

        {role === "seller" ? (
          <GroupedListSection title="Vinculación del negocio">
            <GroupedListRow
              icon="circle-plus"
              label="Crear un negocio"
              description="Creá un perfil para solicitar la verificación del negocio."
              descriptionMaxLines={3}
              showChevron={false}
              showSeparator
              rightAccessory={
                <SelectionIndicator
                  selected={sellerLinkMode === "business"}
                  styles={s}
                />
              }
              onPress={() => {
                setSellerLinkMode("business");
                setInvitationId(null);
              }}
            />

            <GroupedListRow
              icon="handshake"
              label="Usar una invitación"
              description="Únete como miembro de un negocio que te invitó."
              descriptionMaxLines={3}
              showChevron={false}
              showSeparator={sellerUsesInvitation}
              rightAccessory={
                <SelectionIndicator
                  selected={sellerUsesInvitation}
                  styles={s}
                />
              }
              onPress={() => {
                setSellerLinkMode("invitation");
                if (!sellerUsesInvitation) setInvitationId(null);
              }}
            />

            {sellerUsesInvitation && isLoadingInvitations ? (
              <LoadingState
                label="Revisando invitaciones..."
                variant="inline"
                style={s.invitationLoading}
              />
            ) : sellerUsesInvitation && hasInvitationLoadError ? (
              <GroupedListRow
                icon="alert-circle"
                label="No pudimos revisar tus invitaciones"
                description="Toca aquí para intentarlo nuevamente."
                descriptionMaxLines={3}
                showSeparator={false}
                onPress={() => void loadInvitations()}
              />
            ) : sellerUsesInvitation && invitations.length === 0 ? (
              <>
                <GroupedListRow
                  icon="info"
                  label="No tienes invitaciones pendientes"
                  description="Pedile al administrador principal que te invite con este número."
                  descriptionMaxLines={3}
                  showChevron={false}
                  showSeparator={false}
                />
                <View style={s.invitationRetryAction}>
                  <Button
                    title="Revisar invitaciones"
                    variant="white"
                    icon="search"
                    onPress={() => void loadInvitations()}
                  />
                </View>
              </>
            ) : sellerUsesInvitation ? (
              invitations.map((invitation, index) => {
                const selected = invitation.id === invitationId;
                const inviter = invitation.inviterProfileName.trim();
                return (
                  <GroupedListRow
                    key={invitation.id}
                    icon="handshake"
                    label={
                      inviter
                        ? `${inviter} te invitó a ${invitation.businessName}`
                        : `Te invitaron a ${invitation.businessName}`
                    }
                    description={`Unirte como miembro · Vence el ${formatInvitationDate(invitation.expiresAt)}.`}
                    descriptionMaxLines={3}
                    showChevron={false}
                    showSeparator={
                      index < invitations.length - 1 || Boolean(selectedInvitation)
                    }
                    rightAccessory={
                      <SelectionIndicator selected={selected} styles={s} />
                    }
                    onPress={() => {
                      setSellerLinkMode("invitation");
                      setInvitationId(invitation.id);
                    }}
                  />
                );
              })
            ) : null}

            {selectedInvitation ? (
              <GroupedListRow
                icon="x-circle"
                label="Rechazar esta invitación"
                destructive
                showChevron={false}
                showSeparator={false}
                onPress={() => openDeclineInvitation(selectedInvitation)}
              />
            ) : null}
          </GroupedListSection>
        ) : null}

        <Button
          title={
            createdProfileId
              ? "Reintentar activación"
              : selectedInvitation && isRepair
                ? "Aceptar y completar perfil"
                : selectedInvitation
                  ? "Aceptar y crear perfil"
              : requiresBuyerIdentityVerification
                ? "Verificar identidad"
              : usesVerifiedBuyerIdentity
                ? "Activar comprador"
              : isRepair
                ? "Completar perfil"
                : "Crear y activar"
          }
          loading={isSaving}
          onPress={() => void save()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type ScreenStyles = ReturnType<typeof createStyles>;

function FormSection({
  title,
  helper,
  styles,
  children,
}: {
  title: string;
  helper: string;
  styles: ScreenStyles;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.formSection}>
      <Text variant="small" color="textMedium" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.formSurface}>
        <Text variant="small" color="stateAnulated">
          {helper}
        </Text>
        {children}
      </View>
    </View>
  );
}

function SelectionIndicator({
  selected,
  styles,
}: {
  selected: boolean;
  styles: ScreenStyles;
}) {
  const t = useTheme();

  return (
    <View
      style={[
        styles.selectionIndicator,
        selected ? styles.selectionIndicatorSelected : null,
      ]}
    >
      {selected ? (
        <Icon name="check" size={14} color={t.colors.backgroudWhite} />
      ) : null}
    </View>
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
      gap: t.spacing.lg,
    },
    formSection: {
      gap: t.spacing.sm,
    },
    sectionTitle: {
      paddingLeft: t.spacing.md,
    },
    formSurface: {
      ...createRoundedSurfaceStyle(t),
      padding: t.spacing.md,
      gap: t.spacing.md,
    },
    inputContainer: {
      marginBottom: 0,
    },
    invitationLoading: {
      minHeight: 74,
    },
    invitationRetryAction: {
      paddingHorizontal: t.spacing.md,
      paddingBottom: t.spacing.md,
    },
    selectionIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    selectionIndicatorSelected: {
      borderColor: t.colors.primary,
      backgroundColor: t.colors.primary,
    },
  });
}
