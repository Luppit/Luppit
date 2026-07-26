import Button from "@/src/components/button/Button";
import {
  GroupedList,
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { Text } from "@/src/components/Text";
import { openPopup } from "@/src/services/popup.service";
import {
  CurrentBusinessMember,
  CurrentBusinessPendingInvitation,
  CurrentBusinessTeam,
  getCurrentBusinessTeam,
  removeCurrentBusinessMember,
  revokeCurrentBusinessInvitation,
} from "@/src/services/active.profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

function formatInvitationDate(value: string) {
  return new Date(value).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BusinessTeamScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { activeProfile } = useActiveProfile();
  const isOwner = activeProfile?.membershipRole === "owner";
  const s = useMemo(
    () =>
      createStyles(
        t,
        insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT,
        insets.bottom
      ),
    [insets.bottom, insets.top, t]
  );
  const [team, setTeam] = useState<CurrentBusinessTeam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const load = useCallback(async (showFailureToast = true) => {
    if (!isOwner) {
      setTeam(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasLoadError(false);
    const result = await getCurrentBusinessTeam();
    if (!result.ok) {
      setHasLoadError(true);
      setIsLoading(false);
      if (showFailureToast) {
        showError("No se pudo cargar el equipo", result.error.message);
      }
      return;
    }

    setTeam(result.data);
    setIsLoading(false);
  }, [isOwner]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {};
    }, [load])
  );

  const openBlockedMember = () => {
    openPopup({
      type: "summary",
      title: "No se puede quitar a esta persona",
      icon: "info",
      description:
        "Tiene conversaciones asociadas al negocio. Para conservar ese historial, no puedes quitar su acceso desde aquí.",
      actions: [
        {
          id: "understood",
          label: "Entendido",
          icon: "check",
        },
      ],
    });
  };

  const openMember = (member: CurrentBusinessMember) => {
    if (member.membershipRole === "owner") return;
    if (!member.canRemove) {
      openBlockedMember();
      return;
    }

    openPopup({
      type: "summary",
      title: `Quitar a ${member.name} del equipo`,
      icon: "user",
      description: `Su perfil vendedor dejará de tener acceso a ${team?.businessName ?? "este negocio"}. Su cuenta y sus otros perfiles no se eliminarán.`,
      actions: [
        {
          id: "keep-member",
          label: "Conservar acceso",
          icon: "arrow-left",
        },
        {
          id: "remove-member",
          label: "Quitar del equipo",
          icon: "trash-2",
          textColorKey: "error",
          iconColorKey: "error",
          onPress: async () => {
            const result = await removeCurrentBusinessMember(member.membershipId);
            if (!result.ok) {
              if (result.error.code === "business_member_has_conversation_history") {
                openBlockedMember();
                return false;
              }
              showError("No se pudo quitar a la persona", result.error.message);
              return false;
            }

            setTeam((current) =>
              current
                ? {
                    ...current,
                    members: current.members.filter(
                      (currentMember) =>
                        currentMember.membershipId !== member.membershipId
                    ),
                  }
                : current
            );
            showSuccess(
              "Miembro eliminado",
              `${member.name} ya no tiene acceso a ${team?.businessName ?? "este negocio"}.`
            );
            return true;
          },
        },
      ],
    });
  };

  const openInvitation = (invitation: CurrentBusinessPendingInvitation) => {
    openPopup({
      type: "summary",
      title: "Cancelar invitación",
      icon: "x-circle",
      description:
        "La persona ya no podrá aceptar esta invitación. Podrás invitarla de nuevo después.",
      rows: [
        { label: "Destinatario", value: invitation.recipientLabel },
        { label: "Vence", value: formatInvitationDate(invitation.expiresAt) },
      ],
      actions: [
        {
          id: "keep-invitation",
          label: "Conservar",
          icon: "arrow-left",
        },
        {
          id: "revoke-invitation",
          label: "Cancelar invitación",
          icon: "x-circle",
          textColorKey: "error",
          iconColorKey: "error",
          onPress: async () => {
            const result = await revokeCurrentBusinessInvitation(invitation.id);
            if (!result.ok) {
              showError("No se pudo cancelar", result.error.message);
              return false;
            }
            setTeam((current) =>
              current
                ? {
                    ...current,
                    pendingInvitations: current.pendingInvitations.filter(
                      (currentInvitation) => currentInvitation.id !== invitation.id
                    ),
                  }
                : current
            );
            showSuccess("Invitación cancelada");
            return true;
          },
        },
      ],
    });
  };

  if (!isOwner) {
    return (
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <GroupedList>
          <GroupedListRow
            icon="info"
            label="Administración no disponible"
            description="Solo la persona propietaria puede administrar miembros e invitaciones."
            descriptionColor="textMedium"
            showSeparator={false}
          />
        </GroupedList>
      </ScrollView>
    );
  }

  if (isLoading && !team) {
    return <LoadingState label="Cargando equipo..." style={s.loadingState} />;
  }

  if (hasLoadError && !team) {
    return (
      <View style={s.errorState}>
        <GroupedList>
          <GroupedListRow
            icon="alert-circle"
            label="No pudimos cargar el equipo"
            description="Toca para intentarlo nuevamente."
            showSeparator={false}
            onPress={() => void load()}
          />
        </GroupedList>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.intro}>
        <Text variant="subtitle" accessibilityRole="header">
          {team?.businessName || "Tu negocio"}
        </Text>
        <Text variant="small" color="textMedium">
          Consulta quién pertenece al negocio y administra el acceso cuando sea
          posible.
        </Text>
      </View>

      <GroupedListSection title={`Miembros (${team?.members.length ?? 0})`}>
        {(team?.members ?? []).map((member, index, members) => (
          <GroupedListRow
            key={member.membershipId}
            icon="user"
            label={member.name}
            description={
              member.membershipRole === "owner" ? "Persona propietaria" : "Miembro"
            }
            showSeparator={index < members.length - 1}
            showChevron={member.membershipRole === "member"}
            accessibilityLabel={
              member.membershipRole === "member"
                ? `${member.name}. Miembro. Toca para administrar su acceso.`
                : `${member.name}. Persona propietaria.`
            }
            onPress={
              member.membershipRole === "member"
                ? () => openMember(member)
                : undefined
            }
          />
        ))}
      </GroupedListSection>

      <Button
        title="Invitar a alguien"
        icon="circle-plus"
        onPress={() =>
          router.push({
            pathname: "/(detail)/business-invitation-new",
            params: { title: "Nueva invitación", hideMenu: "true" },
          })
        }
      />

      {(team?.pendingInvitations.length ?? 0) > 0 ? (
        <GroupedListSection
          title={`Invitaciones pendientes (${team?.pendingInvitations.length ?? 0})`}
        >
          {(team?.pendingInvitations ?? []).map((invitation, index, invitations) => (
            <GroupedListRow
              key={invitation.id}
              icon="send"
              label={invitation.recipientLabel}
              description={`Vence el ${formatInvitationDate(invitation.expiresAt)}.`}
              showSeparator={index < invitations.length - 1}
              onPress={() => openInvitation(invitation)}
              accessibilityLabel={`${invitation.recipientLabel}. Vence el ${formatInvitationDate(invitation.expiresAt)}. Toca para administrar la invitación.`}
            />
          ))}
        </GroupedListSection>
      ) : null}
    </ScrollView>
  );
}

function createStyles(t: Theme, topInset: number, bottomInset: number) {
  return StyleSheet.create({
    content: {
      paddingTop: topInset + t.spacing.md,
      paddingBottom: bottomInset + t.spacing.xl,
      gap: t.spacing.lg,
    },
    intro: {
      gap: t.spacing.xs,
      paddingHorizontal: t.spacing.md,
    },
    loadingState: {
      flex: 1,
      paddingTop: topInset,
    },
    errorState: {
      flex: 1,
      paddingTop: topInset + t.spacing.md,
    },
  });
}
