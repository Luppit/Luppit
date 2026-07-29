import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { SupportContactRow } from "@/src/components/support/SupportContactRow";
import {
  requestDeletionReauthenticationOtp,
  signOut,
  signOutLocally,
  verifyDeletionReauthenticationOtp,
} from "@/src/lib/supabase";
import { LEGAL_DOCUMENT_CODES } from "@/src/services/legal-document.service";
import { openPopup } from "@/src/services/popup.service";
import {
  AccountDeletionRequestStatus,
  BuyerProfileOverview,
  Profile,
  SellerProfileOverview,
  getCurrentBuyerProfileOverview,
  getCurrentSellerProfileOverview,
  requestCurrentLoginDeletion,
  requestCurrentProfileDeletion,
} from "@/src/services/profile.service";
import { Roles } from "@/src/services/role.service";
import { getCurrentUserRole } from "@/src/services/user.role.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

export default function AccountSettingsScreen() {
  const [role, setRole] = useState<Roles | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const resolveRole = async () => {
      const result = await getCurrentUserRole();
      if (!active) return;

      if (!result.ok) {
        showError("No se pudo cargar la configuración", result.error.message);
        setRole(null);
        setIsRoleLoading(false);
        return;
      }

      setRole(result.data);
      setIsRoleLoading(false);
    };

    void resolveRole();

    return () => {
      active = false;
    };
  }, []);

  if (isRoleLoading) {
    return <LoadingState label="Cargando configuración..." />;
  }

  return role === Roles.SELLER ? (
    <SellerAccountSettingsContent />
  ) : (
    <BuyerAccountSettingsContent />
  );
}

function BuyerAccountSettingsContent() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = useMemo(
    () => createAccountSettingsStyles(t, topContentInset),
    [t, topContentInset]
  );
  const [overview, setOverview] = useState<BuyerProfileOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    const result = await getCurrentBuyerProfileOverview();
    if (!result.ok) {
      setOverview(null);
      setIsLoading(false);
      showError("No se pudo cargar la configuración", result.error.message);
      return;
    }

    setOverview(result.data);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
      return () => {};
    }, [loadOverview])
  );

  if (isLoading) {
    return <LoadingState label="Cargando configuración..." style={s.loadingBox} />;
  }

  return (
    <AccountSettingsContent
      role={Roles.BUYER}
      profile={overview?.profile}
    />
  );
}

function SellerAccountSettingsContent() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = useMemo(
    () => createAccountSettingsStyles(t, topContentInset),
    [t, topContentInset]
  );
  const [overview, setOverview] = useState<SellerProfileOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    const result = await getCurrentSellerProfileOverview();
    if (!result.ok) {
      setOverview(null);
      setIsLoading(false);
      showError("No se pudo cargar la configuración", result.error.message);
      return;
    }

    setOverview(result.data);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
      return () => {};
    }, [loadOverview])
  );

  if (isLoading) {
    return <LoadingState label="Cargando configuración..." style={s.loadingBox} />;
  }

  return (
    <AccountSettingsContent
      role={Roles.SELLER}
      profile={overview?.profile}
    />
  );
}

function AccountSettingsContent({
  role,
  profile,
}: {
  role: Roles;
  profile?: Profile | null;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = useMemo(
    () => createAccountSettingsStyles(t, topContentInset),
    [t, topContentInset]
  );
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const isSeller = role === Roles.SELLER;
  const { activeProfile, profiles, refreshProfiles } = useActiveProfile();
  const isBusinessOwner = activeProfile?.membershipRole === "owner";
  const phone = profile?.phone?.trim() || "";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <GroupedListSection title="Cuenta">
        <GroupedListRow
          icon="smartphone"
          label="Número telefónico"
          value={profile?.phone?.trim() || "Sin número registrado"}
        />
        <GroupedListRow
          icon="user"
          label="Nombre"
          onPress={() =>
            router.push({
              pathname: "/(modal)/profile-field-edit",
              params: {
                title: "Editar nombre",
                field: "name",
                value: profile?.name ?? "",
              },
            })
          }
        />
        <GroupedListRow
          icon="file-text"
          label="Documento de identificación"
          onPress={() =>
            router.push({
              pathname: "/(modal)/profile-field-edit",
              params: {
                title: "Editar documento",
                field: "id_document",
                value: profile?.id_document ?? "",
              },
            })
          }
        />
        <GroupedListRow
          icon="mail-warning"
          label="Correo"
          showSeparator={false}
          onPress={() =>
            router.push({
              pathname: "/(modal)/email-setup",
              params: { title: "Cambiar correo" },
            })
          }
        />
      </GroupedListSection>

      {isSeller ? (
        <GroupedListSection title="Negocio">
          <GroupedListRow
            icon="house"
            label="Información del negocio"
            showSeparator={isBusinessOwner}
            onPress={() =>
              router.push({
                pathname: "/(detail)/business-profile",
                params: { title: "Negocio", hideMenu: "true" },
              })
            }
          />
          {isBusinessOwner ? (
            <GroupedListRow
              icon="user"
              label="Equipo"
              showSeparator={false}
              onPress={() =>
                router.push({
                  pathname: "/(detail)/business-invitations",
                  params: {
                    title: "Equipo",
                    hideMenu: "true",
                  },
                })
              }
            />
          ) : null}
        </GroupedListSection>
      ) : null}

      <GroupedListSection title="Notificaciones y ayuda">
        <GroupedListRow
          icon="bell"
          label="Notificaciones"
          onPress={() =>
            router.push({
              pathname: "/(detail)/notifications",
              params: { title: "Notificaciones", hideMenu: "true" },
            })
          }
        />
        <GroupedListRow
          icon="help-circle"
          label="Ayuda"
          onPress={() =>
            router.push({
              pathname: "/(detail)/faq",
              params: { title: "Ayuda", hideMenu: "true" },
            })
          }
        />
        <SupportContactRow />
      </GroupedListSection>

      <GroupedListSection title="Legal">
        <GroupedListRow
          icon="file-text"
          label="Política de privacidad"
          onPress={() =>
            openLegalDocument(
              LEGAL_DOCUMENT_CODES.privacyPolicy,
              "Política de privacidad"
            )
          }
        />
        <GroupedListRow
          icon="file-pen-line"
          label="Términos y condiciones"
          onPress={() =>
            openLegalDocument(
              LEGAL_DOCUMENT_CODES.termsConditions,
              "Términos y condiciones"
            )
          }
        />
        <GroupedListRow
          icon="info"
          label="Versión"
          value={appVersion}
          showSeparator={false}
        />
      </GroupedListSection>

      <GroupedListSection title="Seguridad">
        <GroupedListRow
          icon="ban"
          label="Cuentas bloqueadas"
          onPress={() =>
            router.push({
              pathname: "/(detail)/blocked-accounts",
              params: { title: "Cuentas bloqueadas", hideMenu: "true" },
            })
          }
        />
        <GroupedListRow
          icon="log-out"
          label="Cerrar sesión"
          destructive
          onPress={openSignOutConfirmation}
        />
        <GroupedListRow
          icon="user"
          label="Eliminar este perfil"
          destructive
          onPress={() =>
            profiles.length > 1
              ? openProfileDeletionConfirmation({
                  phone,
                  isBusinessOwner,
                  refreshProfiles,
                })
              : openLastProfileDeletionExplanation()
          }
        />
        <GroupedListRow
          icon="trash-2"
          label="Eliminar cuenta"
          destructive
          showSeparator={false}
          onPress={() => openAccountDeletionConfirmation({ phone })}
        />
      </GroupedListSection>
    </ScrollView>
  );
}

function openLegalDocument(code: string, title: string) {
  router.push({
    pathname: "/(detail)/legal-document",
    params: { code, title, hideMenu: "true" },
  });
}

function openSignOutConfirmation() {
  openPopup({
    type: "summary",
    title: "Cerrar sesión",
    icon: "log-out",
    description: "Saldrás de esta cuenta en este dispositivo.",
    actions: [
      {
        id: "stay-signed-in",
        label: "Volver",
        icon: "arrow-left",
        backgroundColorKey: "backgroudWhite",
        textColorKey: "textDark",
        iconColorKey: "textDark",
      },
      {
        id: "confirm-sign-out",
        label: "Cerrar sesión",
        icon: "log-out",
        backgroundColorKey: "backgroudWhite",
        textColorKey: "error",
        iconColorKey: "error",
        onPress: async () => {
          try {
            await signOut();
            return true;
          } catch (error) {
            showError(
              "No se pudo cerrar sesión",
              error instanceof Error ? error.message : undefined
            );
            return false;
          }
        },
      },
    ],
  });
}

function openLastProfileDeletionExplanation() {
  openPopup({
    type: "summary",
    title: "Este es tu último perfil",
    icon: "user",
    description:
      "El último perfil no se puede eliminar por separado. Para eliminarlo debes solicitar la eliminación de la cuenta completa.",
    actions: [
      {
        id: "close-last-profile-message",
        label: "Entendido",
        icon: "check",
      },
    ],
  });
}

function openProfileDeletionConfirmation({
  phone,
  isBusinessOwner,
  refreshProfiles,
}: {
  phone: string;
  isBusinessOwner: boolean;
  refreshProfiles: (preferredProfileId?: string | null) => Promise<boolean>;
}) {
  const businessConsequence = isBusinessOwner
    ? " Si tu negocio tiene otros miembros, la administración pasará al integrante de mayor antigüedad."
    : "";

  openPopup({
    type: "summary",
    title: "Eliminar este perfil",
    icon: "user",
    description:
      "Esta acción no tiene periodo de gracia. Cerraremos las negociaciones activas y eliminaremos la identidad, archivos y contenido personal de este perfil dentro de cinco días hábiles. Tu acceso y tus otros perfiles se conservarán." +
      businessConsequence,
    actions: [
      {
        id: "cancel-profile-deletion",
        label: "Volver",
        icon: "arrow-left",
      },
      {
        id: "continue-profile-deletion",
        label: "Verificar teléfono",
        icon: "trash-2",
        textColorKey: "error",
        iconColorKey: "error",
        onPress: async () => {
          try {
            const verification =
              await requestDeletionReauthenticationOtp(phone);
            setTimeout(
              () =>
                openDeletionOtpConfirmation({
                  scope: "PROFILE",
                  verification,
                  refreshProfiles,
                }),
              250
            );
            return true;
          } catch (error) {
            showError(
              "No pudimos enviar el código",
              error instanceof Error ? error.message : undefined
            );
            return false;
          }
        },
      },
    ],
  });
}

function openAccountDeletionConfirmation({ phone }: { phone: string }) {
  openPopup({
    type: "summary",
    title: "Eliminar cuenta",
    icon: "trash-2",
    description:
      "Esta acción elimina el acceso y todos tus perfiles, sin periodo de gracia. Cerraremos negociaciones activas, transferiremos la administración de negocios con miembros sobrevivientes y eliminaremos tu identidad, archivos y contenido personal dentro de cinco días hábiles. Las retenciones anonimizadas y legales se limitan a lo descrito en la Política de Privacidad.",
    actions: [
      {
        id: "keep-account",
        label: "Volver",
        icon: "arrow-left",
        backgroundColorKey: "backgroudWhite",
        textColorKey: "textDark",
        iconColorKey: "textDark",
      },
      {
        id: "continue-account-deletion",
        label: "Verificar teléfono",
        icon: "trash-2",
        backgroundColorKey: "backgroudWhite",
        textColorKey: "error",
        iconColorKey: "error",
        onPress: async () => {
          try {
            const verification =
              await requestDeletionReauthenticationOtp(phone);
            setTimeout(
              () =>
                openDeletionOtpConfirmation({
                  scope: "ACCOUNT",
                  verification,
                }),
              250
            );
            return true;
          } catch (error) {
            showError(
              "No pudimos enviar el código",
              error instanceof Error ? error.message : undefined
            );
            return false;
          }
        },
      },
    ],
  });
}

function openDeletionOtpConfirmation({
  scope,
  verification,
  refreshProfiles,
}: {
  scope: "ACCOUNT" | "PROFILE";
  verification: { phone: string; userId: string };
  refreshProfiles?: (preferredProfileId?: string | null) => Promise<boolean>;
}) {
  let otpCode = "";
  openPopup({
    type: "summary",
    title: "Confirma que sos vos",
    icon: "smartphone",
    description:
      "Ingresá el código de 6 dígitos enviado a tu teléfono. La solicitud solo se registrará después de verificarlo.",
    dismissOnBackdropPress: false,
    inputs: [
      {
        id: "account-deletion-otp",
        kind: "otp",
        payload_key: "otp",
        label: "Código de verificación",
        helper_text: "El código vence pronto y solo puede usarse una vez.",
        otp_length: 6,
        is_required: true,
        onValueChange: (value) => {
          otpCode = typeof value === "string"
            ? value.replace(/\D/g, "").slice(0, 6)
            : "";
        },
      },
    ],
    actions: [
      {
        id: "cancel-deletion-otp",
        label: "Volver",
        icon: "arrow-left",
      },
      {
        id: "submit-deletion-request",
        label: "Eliminar",
        icon: "trash-2",
        textColorKey: "error",
        iconColorKey: "error",
        onPress: async () => {
          if (otpCode.length !== 6) {
            return {
              shouldClose: false,
              inputErrors: {
                "account-deletion-otp": "Ingresá el código completo de 6 dígitos.",
              },
            };
          }

          try {
            await verifyDeletionReauthenticationOtp(
              verification.phone,
              otpCode,
              verification.userId
            );
          } catch (error) {
            return {
              shouldClose: false,
              inputErrors: {
                "account-deletion-otp":
                  error instanceof Error
                    ? error.message
                    : "El código no es válido.",
              },
              resetInputIds: ["account-deletion-otp"],
            };
          }

          const result =
            scope === "ACCOUNT"
              ? await requestCurrentLoginDeletion()
              : await requestCurrentProfileDeletion();
          if (!result.ok) {
            showError(
              "No se pudo registrar la eliminación",
              result.error.message
            );
            return false;
          }

          try {
            await Clipboard.setStringAsync(result.data.statusUrl);
          } catch {
            // The confirmation popup still offers an explicit copy action.
          }

          if (scope === "ACCOUNT") {
            await signOutLocally();
          } else {
            await refreshProfiles?.();
          }

          setTimeout(() => openDeletionAccepted(result.data), 250);
          return true;
        },
      },
    ],
  });
}

function openDeletionAccepted(request: AccountDeletionRequestStatus) {
  const dueDate = new Intl.DateTimeFormat("es-CR", {
    dateStyle: "long",
  }).format(new Date(request.dueAt));
  const isFailed = request.status === "failed";

  openPopup({
    type: "summary",
    title: isFailed ? "Solicitud con incidencia" : "Solicitud recibida",
    icon: isFailed ? "alert-circle" : "shield-check",
    metadata: `Estado: ${deletionStatusLabel(request.status)}`,
    description: isFailed
      ? "La solicitud quedó registrada, pero necesita revisión de soporte. Guardá la referencia y el enlace de estado; no lo compartás."
      : "Tu solicitud quedó registrada y se procesará automáticamente. No tenés que hacer nada más. Guardá el enlace de estado en un lugar seguro y no lo compartás.",
    dismissOnBackdropPress: false,
    rows: [
      { label: "Código de referencia", value: request.requestId },
      { label: "Plazo máximo", value: dueDate },
    ],
    actions: [
      {
        id: "copy-deletion-status",
        label: "Copiar enlace",
        icon: "copy",
        showPendingState: false,
        onPress: async () => {
          try {
            await Clipboard.setStringAsync(request.statusUrl);
            return {
              shouldClose: false,
              feedback: {
                tone: "success",
                title: "Enlace copiado",
                message: "Guardado en tu portapapeles.",
                presentation: "toast",
              },
            };
          } catch {
            return {
              shouldClose: false,
              feedback: {
                tone: "error",
                title: "No se pudo copiar el enlace",
                message: "Intentá nuevamente.",
                presentation: "toast",
              },
            };
          }
        },
      },
      {
        id: "close-deletion-confirmation",
        label: "Entendido",
        icon: "check",
        backgroundColorKey: "primary",
        textColorKey: "backgroudWhite",
        iconColorKey: "backgroudWhite",
      },
    ],
  });
}

function deletionStatusLabel(status: AccountDeletionRequestStatus["status"]) {
  switch (status) {
    case "completed":
      return "Completada";
    case "failed":
      return "Requiere soporte";
    case "processing":
      return "Procesando";
    case "canceled":
      return "Cancelada";
    default:
      return "En cola";
  }
}

function createAccountSettingsStyles(t: Theme, topContentInset = 0) {
  return StyleSheet.create({
    content: {
      gap: t.spacing.lg,
      paddingTop: topContentInset + t.spacing.sm,
      paddingBottom: t.spacing.xl,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingTop: topContentInset,
    },
  });
}
