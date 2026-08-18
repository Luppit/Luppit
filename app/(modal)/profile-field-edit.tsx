import Button from "@/src/components/button/Button";
import { TextField } from "@/src/components/inputField/InputField";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import {
  ProfileEditableField,
  updateCurrentProfileField,
} from "@/src/services/profile.service";
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
import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const FIELD_CONFIG: Record<
  ProfileEditableField,
  {
    label: string;
    helper: string;
    placeholder: string;
    success: string;
  }
> = {
  name: {
    label: "Nombre",
    helper: "Este nombre se usa para identificarte dentro de Luppit.",
    placeholder: "Ingresa tu nombre",
    success: "Nombre actualizado",
  },
  id_document: {
    label: "Documento de identificación",
    helper: "Ingresa los 9 dígitos de tu cédula personal, sin espacios ni guiones.",
    placeholder: "Ej. 123456789",
    success: "Documento actualizado",
  },
};

function isEditableField(value: unknown): value is ProfileEditableField {
  return value === "name" || value === "id_document";
}

export default function ProfileFieldEditScreen() {
  const { activeProfile } = useActiveProfile();
  const t = useTheme();
  const s = useMemo(() => createProfileFieldEditStyles(t), [t]);
  const params = useLocalSearchParams<{
    field?: string | string[];
    value?: string | string[];
  }>();
  const fieldParam = Array.isArray(params.field) ? params.field[0] : params.field;
  const field: ProfileEditableField = isEditableField(fieldParam) ? fieldParam : "name";
  const initialValue = Array.isArray(params.value) ? params.value[0] : params.value;
  const config = FIELD_CONFIG[field];
  const [value, setValue] = useState(initialValue ?? "");
  const [didSubmit, setDidSubmit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isVerifiedIdentity = activeProfile?.identityStatus === "VERIFIED";

  useEffect(() => {
    if (isVerifiedIdentity) router.back();
  }, [isVerifiedIdentity]);

  if (isVerifiedIdentity) return null;

  const normalizedValue = value.trim();
  const error = didSubmit
    ? field === "id_document" &&
      normalizedValue.length > 0 &&
      !isValidCostaRicaPersonalId(value)
      ? COSTA_RICA_PERSONAL_ID_ERROR
      : ""
    : "";

  const save = async () => {
    setDidSubmit(true);
    if (!normalizedValue) {
      showMissingFields([config.label.toLowerCase()]);
      return;
    }
    if (field === "id_document" && !isValidCostaRicaPersonalId(value)) {
      return;
    }

    setIsSaving(true);
    const result = await updateCurrentProfileField(field, normalizedValue);
    setIsSaving(false);

    if (!result.ok) {
      showError("No se pudo actualizar", result.error.message);
      return;
    }

    showSuccess(config.success);
    router.back();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <View style={s.section}>
          <Text variant="small" color="textMedium" style={s.sectionTitle}>
            {config.label}
          </Text>

          <View style={s.surface}>
            <Text variant="body" color="textMedium">
              {config.helper}
            </Text>

            <TextField
              accessibilityLabel={config.label}
              value={value}
              onChangeText={(nextValue) => {
                setValue(nextValue);
              }}
              placeholder={config.placeholder}
              hasError={Boolean(error)}
              error={error}
              autoCapitalize={field === "name" ? "words" : "characters"}
              autoCorrect={field === "name"}
              keyboardType={field === "id_document" ? "number-pad" : "default"}
              inputMode={field === "id_document" ? "numeric" : "text"}
              maxLength={
                field === "id_document"
                  ? COSTA_RICA_PERSONAL_ID_LENGTH
                  : undefined
              }
              returnKeyType="done"
              onSubmitEditing={() => void save()}
              baseContainerStyle={s.inputContainer}
            />

            <Button
              title="Guardar cambios"
              loading={isSaving}
              disabled={isSaving}
              onPress={() => void save()}
            />
          </View>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

function createProfileFieldEditStyles(t: Theme) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing.xl,
    },
    section: {
      gap: t.spacing.sm,
    },
    sectionTitle: {
      paddingLeft: t.spacing.md,
    },
    surface: {
      ...createRoundedSurfaceStyle(t),
      overflow: "hidden",
      padding: t.spacing.md,
      gap: t.spacing.md,
    },
    inputContainer: {
      marginBottom: 0,
    },
  });
}
