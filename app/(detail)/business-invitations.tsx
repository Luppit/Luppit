import Button from "@/src/components/button/Button";
import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import { TextField } from "@/src/components/inputField/InputField";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  CurrentBusinessInvitation,
  getCurrentBusinessInvitations,
  inviteCurrentUserToBusiness,
  revokeCurrentBusinessInvitation,
} from "@/src/services/active.profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

const statusLabels: Record<CurrentBusinessInvitation["status"], string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  declined: "Rechazada",
  revoked: "Revocada",
  expired: "Vencida",
};

export default function BusinessInvitationsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { activeProfile } = useActiveProfile();
  const profileId = activeProfile?.profile.id ?? "";
  const isOwner = activeProfile?.membershipRole === "owner";
  const s = useMemo(
    () => createStyles(t, insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT, insets.bottom),
    [insets.bottom, insets.top, t]
  );
  const [phone, setPhone] = useState("");
  const [invitations, setInvitations] = useState<CurrentBusinessInvitation[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profileId || !isOwner) return;
    const result = await getCurrentBusinessInvitations(profileId);
    if (!result.ok) {
      showError("No se pudieron cargar las invitaciones", result.error.message);
      return;
    }
    setInvitations(result.data);
  }, [isOwner, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async () => {
    if (!phone.trim()) return;
    setIsSaving(true);
    const result = await inviteCurrentUserToBusiness(profileId, phone);
    setIsSaving(false);
    if (!result.ok) {
      showError("No se pudo enviar la invitación", result.error.message);
      return;
    }
    setPhone("");
    await load();
    showSuccess("Invitación creada", "Estará disponible durante siete días.");
  };

  if (!isOwner) {
    return (
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <GroupedListSection title="Invitaciones">
          <GroupedListRow
            icon="info"
            label="Acceso de propietario"
            description="Solo la persona propietaria puede administrar invitaciones."
            showSeparator={false}
          />
        </GroupedListSection>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.formSection}>
        <Text variant="small" color="textMedium" style={s.sectionTitle}>
          Nueva invitación
        </Text>
        <View style={s.formSurface}>
          <Text variant="small" color="stateAnulated">
            Usa el número asociado al inicio de sesión de Luppit.
          </Text>
          <TextField
            label="Teléfono de Luppit"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+506 8888 8888"
            baseContainerStyle={s.inputContainer}
          />
          <Button
            title="Invitar"
            loading={isSaving}
            disabled={!phone.trim()}
            onPress={() => void invite()}
          />
        </View>
      </View>

      <GroupedListSection title="Invitaciones">
        {invitations.length === 0 ? (
          <GroupedListRow
            icon="info"
            label="No hay invitaciones"
            description="Las invitaciones que envíes aparecerán aquí."
            showSeparator={false}
          />
        ) : (
          invitations.map((invitation, index) => (
            <GroupedListRow
              key={invitation.id}
              icon="circle-plus"
              label={statusLabels[invitation.status]}
              description={
                invitation.status === "pending"
                  ? "Vence " + new Date(invitation.expiresAt).toLocaleDateString()
                  : undefined
              }
              showSeparator={index < invitations.length - 1}
              destructive={invitation.status === "pending"}
              onPress={
                invitation.status === "pending"
                  ? async () => {
                      const result = await revokeCurrentBusinessInvitation(
                        profileId,
                        invitation.id
                      );
                      if (!result.ok) {
                        showError("No se pudo revocar", result.error.message);
                        return;
                      }
                      await load();
                    }
                  : undefined
              }
            />
          ))
        )}
      </GroupedListSection>
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
  });
}
