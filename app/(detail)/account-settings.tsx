import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { SupportContactRow } from "@/src/components/support/SupportContactRow";
import { signOut } from "@/src/lib/supabase";
import { LEGAL_DOCUMENT_CODES } from "@/src/services/legal-document.service";
import { openPopup } from "@/src/services/popup.service";
import {
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
import { showError, showSuccess } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";
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
  const { activeProfile, profiles } = useActiveProfile();
  const isBusinessOwner = activeProfile?.membershipRole === "owner";

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
          onPress={
            profiles.length > 1 ? openProfileDeletionConfirmation : undefined
          }
        />
        <GroupedListRow
          icon="trash-2"
          label="Eliminar cuenta"
          destructive
          showSeparator={false}
          onPress={openAccountDeletionConfirmation}
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

function openProfileDeletionConfirmation() {
  openPopup({
    type: "summary",
    title: "Eliminar perfil",
    icon: "user",
    description:
      "Solicitaremos la eliminación de este perfil. Tu inicio de sesión y tus otros perfiles se conservarán.",
    actions: [
      {
        id: "cancel-profile-deletion",
        label: "Volver",
        icon: "arrow-left",
      },
      {
        id: "confirm-profile-deletion",
        label: "Solicitar eliminación",
        icon: "trash-2",
        textColorKey: "error",
        iconColorKey: "error",
        onPress: async () => {
          const result = await requestCurrentProfileDeletion();
          if (!result.ok) {
            showError("No se pudo solicitar la eliminación", result.error.message);
            return false;
          }
          showSuccess(
            "Solicitud recibida",
            "Revisaremos la eliminación de este perfil."
          );
          return true;
        },
      },
    ],
  });
}

function openAccountDeletionConfirmation() {
  openPopup({
    type: "summary",
    title: "Eliminar cuenta",
    icon: "trash-2",
    description:
      "Solicitaremos la eliminación de tu cuenta completa y los datos personales asociados. El proceso puede requerir revisión manual; te avisaremos cuando se complete.",
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
        id: "confirm-account-deletion",
        label: "Solicitar eliminación",
        icon: "trash-2",
        backgroundColorKey: "backgroudWhite",
        textColorKey: "error",
        iconColorKey: "error",
        onPress: async () => {
          const result = await requestCurrentLoginDeletion();
          if (!result.ok) {
            showError("No se pudo solicitar", result.error.message);
            return false;
          }

          showSuccess("Solicitud enviada");
          return true;
        },
      },
    ],
  });
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
