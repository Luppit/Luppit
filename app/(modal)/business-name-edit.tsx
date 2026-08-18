import Button from "@/src/components/button/Button";
import { TextField } from "@/src/components/inputField/InputField";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import { updateCurrentBusinessCommercialName } from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showMissingFields, showSuccess } from "@/src/utils/useToast";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, TouchableWithoutFeedback, View } from "react-native";

export default function BusinessNameEditScreen() {
  const { state, activeProfile } = useActiveProfile();
  const canManage = activeProfile?.membershipRole === "owner";
  const params = useLocalSearchParams<{ value?: string | string[] }>();
  const initialValue = Array.isArray(params.value) ? params.value[0] : params.value;
  const [value, setValue] = useState(initialValue ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const t = useTheme();
  const s = useMemo(() => createStyles(t), [t]);

  useEffect(() => {
    if (state !== "loading" && !canManage) router.back();
  }, [canManage, state]);

  if (state !== "loading" && !canManage) return null;

  const save = async () => {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized) {
      showMissingFields(["nombre comercial"]);
      return;
    }

    setIsSaving(true);
    const result = await updateCurrentBusinessCommercialName(normalized);
    setIsSaving(false);
    if (!result.ok) {
      showError("No pudimos actualizar el nombre", result.error.message);
      return;
    }

    showSuccess("Nombre comercial actualizado");
    router.back();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <View style={s.surface}>
          <Text color="textMedium">
            Este es el nombre que verán los compradores dentro de Luppit.
          </Text>
          <TextField
            label="Nombre comercial"
            value={value}
            onChangeText={setValue}
            autoCapitalize="words"
            autoCorrect
            maxLength={120}
            editable={!isSaving}
            returnKeyType="done"
            onSubmitEditing={() => void save()}
          />
          <Button
            title="Guardar cambios"
            loading={isSaving}
            disabled={isSaving}
            onPress={() => void save()}
          />
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing.xl,
    },
    surface: {
      ...createRoundedSurfaceStyle(t),
      padding: t.spacing.md,
      gap: t.spacing.md,
    },
  });
}
