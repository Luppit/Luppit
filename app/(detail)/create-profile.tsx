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
  completeCurrentUserProfileSetup,
  createCurrentUserProfile,
  CurrentUserBusinessInvitation,
  declineCurrentUserBusinessInvitation,
  getCurrentUserBusinessInvitations,
} from "@/src/services/active.profile.service";
import { openPopup } from "@/src/services/popup.service";
import { Theme, useTheme } from "@/src/themes";
import {
  COSTA_RICA_LEGAL_ID_ERROR,
  COSTA_RICA_LEGAL_ID_LENGTH,
  COSTA_RICA_PERSONAL_ID_ERROR,
  COSTA_RICA_PERSONAL_ID_LENGTH,
  isValidCostaRicaLegalId,
  isValidCostaRicaPersonalId,
} from "@/src/utils/costaRicaIdDocument";
import { showError, showSuccess } from "@/src/utils/useToast";
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
    setIsLoadingInvitations(false);
  }, []);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  useEffect(() => {
    if (params.setup === "true" && state === "ready") {
      router.replace("/");
    }
  }, [params.setup, state]);

  const sellerNeedsInvitation = role === "seller" && hasProfiles && !isRepair;
  const sellerCreatesBusiness =
    role === "seller" && !invitationId && !sellerNeedsInvitation;
  const selectedInvitation =
    invitations.find((invitation) => invitation.id === invitationId) ?? null;
  const idDocumentError =
    didSubmit && !isRepair && !isValidCostaRicaPersonalId(idDocument)
      ? COSTA_RICA_PERSONAL_ID_ERROR
      : "";
  const businessIdDocumentError =
    didSubmit &&
    sellerCreatesBusiness &&
    !isValidCostaRicaLegalId(businessIdDocument)
      ? COSTA_RICA_LEGAL_ID_ERROR
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
      router.replace("/");
      return;
    }

    setDidSubmit(true);
    if (!isRepair && !name.trim()) {
      showError("Faltan datos", "Completa el nombre.");
      return;
    }
    if (!isRepair && !isValidCostaRicaPersonalId(idDocument)) {
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
      !businessName.trim()
    ) {
      showError("Faltan datos", "Completa el nombre del negocio.");
      return;
    }
    if (
      sellerCreatesBusiness &&
      !isValidCostaRicaLegalId(businessIdDocument)
    ) {
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
    showProfileReady();
    router.replace("/");
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
      description: `Esta invitación dejará de estar disponible y no te unirás a ${invitation.businessName}. La persona propietaria podrá invitarte de nuevo después.`,
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
        {!isRepair ? (
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

        {isLoadingInvitations ? (
          <GroupedListSection title="Invitaciones pendientes">
            <LoadingState
              label="Revisando invitaciones..."
              variant="inline"
              style={s.invitationLoading}
            />
          </GroupedListSection>
        ) : hasInvitationLoadError ? (
          <GroupedListSection title="Invitaciones pendientes">
            <GroupedListRow
              icon="alert-circle"
              label="No pudimos revisar tus invitaciones"
              description="Toca para intentarlo nuevamente."
              showSeparator={false}
              onPress={() => void loadInvitations()}
            />
          </GroupedListSection>
        ) : invitations.length > 0 ? (
          <GroupedListSection title="Invitaciones pendientes">
            {invitations.map((invitation, index) => {
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
                  description={`Crea un perfil vendedor como miembro · Vence el ${formatInvitationDate(invitation.expiresAt)}.`}
                  descriptionMaxLines={3}
                  showChevron={false}
                  showSeparator={
                    index < invitations.length - 1 || Boolean(selectedInvitation)
                  }
                  rightAccessory={
                    <SelectionIndicator selected={selected} styles={s} />
                  }
                  onPress={() => {
                    setRole("seller");
                    setInvitationId(invitation.id);
                  }}
                />
              );
            })}
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

        {!requiresBusinessRepair && (!isRepair || activeProfile?.role == null) ? (
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
                setInvitationId(null);
              }}
            />
            <GroupedListRow
              icon="handshake"
              label="Vendedor"
              description={
                sellerNeedsInvitation
                  ? "Necesitas una invitación vigente para crear otro perfil vendedor."
                  : "Para vender desde un negocio."
              }
              descriptionMaxLines={3}
              showChevron={false}
              showSeparator={false}
              rightAccessory={
                <SelectionIndicator selected={role === "seller"} styles={s} />
              }
              onPress={() => setRole("seller")}
            />
          </GroupedListSection>
        ) : null}

        {sellerNeedsInvitation &&
        !isLoadingInvitations &&
        !hasInvitationLoadError &&
        invitations.length === 0 ? (
          <GroupedListSection title="Invitación de negocio">
            <GroupedListRow
              icon="info"
              label="Necesitas una invitación"
              description="La persona propietaria del negocio debe invitar el número con el que inicias sesión en Luppit."
              descriptionMaxLines={3}
              showSeparator={false}
            />
          </GroupedListSection>
        ) : null}

        {sellerCreatesBusiness ? (
          <FormSection
            title="Datos del negocio"
            helper="Este perfil será propietario del negocio."
            styles={s}
          >
            <TextField
              label="Nombre del negocio"
              value={businessName}
              onChangeText={setBusinessName}
              baseContainerStyle={s.inputContainer}
            />
            <TextField
              label="Identificación del negocio"
              value={businessIdDocument}
              onChangeText={setBusinessIdDocument}
              hasError={Boolean(businessIdDocumentError)}
              error={businessIdDocumentError}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={COSTA_RICA_LEGAL_ID_LENGTH}
              baseContainerStyle={s.inputContainer}
            />
          </FormSection>
        ) : null}

        <Button
          title={
            createdProfileId
              ? "Reintentar activación"
              : selectedInvitation && isRepair
                ? "Aceptar y completar perfil"
                : selectedInvitation
                  ? "Aceptar y crear perfil"
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
