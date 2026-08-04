import Button from "@/src/components/button/Button";
import { GroupedList } from "@/src/components/groupedList/GroupedList";
import {
  defaultCountryCode,
  InputPhone,
} from "@/src/components/inputPhone/InputPhone";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { Text } from "@/src/components/Text";
import { inviteCurrentUserToBusiness } from "@/src/services/active.profile.service";
import { Theme, useTheme } from "@/src/themes";
import {
  showError,
  showMissingFields,
  showSuccess,
} from "@/src/utils/useToast";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

const PHONE_REGEX = /^[0-9]{8}$/;
const PHONE_NUMBER_LENGTH_ERROR = "El teléfono celular debe tener 8 dígitos.";
const INLINE_PHONE_ERROR_CODES = new Set([
  "luppit_login_not_found",
  "cannot_invite_self",
  "business_membership_already_exists",
]);

function normalizePhoneInput(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  const localDigits =
    digits.startsWith("506") && digits.length > 8 ? digits.slice(3) : digits;
  return localDigits;
}

export default function NewBusinessInvitationScreen() {
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
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const invite = async () => {
    const phoneNumber = phone.trim();
    if (!phoneNumber) {
      setPhoneError("");
      showMissingFields(["número de teléfono"]);
      return;
    }
    if (!PHONE_REGEX.test(phoneNumber)) {
      setPhoneError(PHONE_NUMBER_LENGTH_ERROR);
      return;
    }

    setIsSaving(true);
    const result = await inviteCurrentUserToBusiness(
      defaultCountryCode + phoneNumber
    );
    setIsSaving(false);
    if (!result.ok) {
      if (result.error.code && INLINE_PHONE_ERROR_CODES.has(result.error.code)) {
        setPhoneError(result.error.message);
        return;
      }
      showError("No se pudo enviar la invitación", result.error.message);
      return;
    }

    showSuccess(
      "Invitación enviada",
      "La persona podrá aceptarla en Luppit durante los próximos 7 días."
    );
    router.back();
  };

  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <View style={s.intro}>
        <Text variant="subtitle" accessibilityRole="header">
          Invita a alguien a tu negocio
        </Text>
        <Text variant="body" color="textMedium">
          Usa el número con el que inicia sesión en Luppit. La invitación
          aparecerá en Crear perfil, no por SMS, y vencerá en 7 días. Al
          aceptarla, su perfil vendedor se unirá a tu negocio como miembro.
        </Text>
      </View>

      <GroupedList>
        <View style={s.formContent}>
          <InputPhone
            label="Número de teléfono"
            value={phone}
            onChangeText={(text) => {
              setPhone(normalizePhoneInput(text));
              if (phoneError) setPhoneError("");
            }}
            hasError={Boolean(phoneError)}
            error={phoneError}
            placeholder="8888 8888"
            autoComplete="off"
            textContentType="none"
            returnKeyType="send"
            onSubmitEditing={() => void invite()}
            editable={isOwner && !isSaving}
            accessibilityLabel="Número de teléfono de la persona invitada"
            accessibilityHint={
              phoneError ||
              "Ingresa los ocho dígitos del número con el que inicia sesión en Luppit"
            }
            baseContainerStyle={s.inputContainer}
          />
        </View>
      </GroupedList>

      <Button
        title="Enviar invitación"
        icon="send"
        loading={isSaving}
        disabled={!isOwner}
        onPress={() => void invite()}
      />

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
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
    },
    formContent: {
      padding: t.spacing.md,
    },
    inputContainer: {
      marginBottom: 0,
    },
  });
}
