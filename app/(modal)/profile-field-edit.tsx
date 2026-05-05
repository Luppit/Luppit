import Button from "@/src/components/button/Button";
import { Icon } from "@/src/components/Icon";
import { TextField } from "@/src/components/inputField/InputField";
import { Text } from "@/src/components/Text";
import {
  ProfileEditableField,
  updateCurrentProfileField,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
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
    icon: "user" | "file-pen-line";
  }
> = {
  name: {
    label: "Nombre",
    helper: "Este nombre se usa para identificarte dentro de Luppit.",
    placeholder: "Ingresa tu nombre",
    success: "Nombre actualizado",
    icon: "user",
  },
  id_document: {
    label: "Documento de identificación",
    helper: "Mantén tu documento actualizado para futuras validaciones de cuenta.",
    placeholder: "Ingresa tu documento",
    success: "Documento actualizado",
    icon: "file-pen-line",
  },
};

function isEditableField(value: unknown): value is ProfileEditableField {
  return value === "name" || value === "id_document";
}

export default function ProfileFieldEditScreen() {
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

  const normalizedValue = value.trim();
  const error =
    didSubmit && !normalizedValue
      ? field === "name"
        ? "Ingresa tu nombre."
        : "Ingresa tu documento de identificación."
      : "";
  const canSave = normalizedValue.length > 0 && !isSaving;

  const save = async () => {
    setDidSubmit(true);
    if (!canSave) return;

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
        <View style={s.surface}>
          <View style={s.iconBadge}>
            <Icon name={config.icon} size={22} color={t.colors.primary} />
          </View>

          <View style={s.titleBlock}>
            <Text variant="subtitle">{config.label}</Text>
            <Text color="stateAnulated">{config.helper}</Text>
          </View>

          <TextField
            label={config.label}
            value={value}
            onChangeText={(nextValue) => {
              setValue(nextValue);
              if (didSubmit) setDidSubmit(false);
            }}
            placeholder={config.placeholder}
            hasError={Boolean(error)}
            error={error}
            autoCapitalize={field === "name" ? "words" : "characters"}
            autoCorrect={field === "name"}
            returnKeyType="done"
            onSubmitEditing={() => void save()}
            baseContainerStyle={s.inputContainer}
          />

          <Button
            title="Guardar cambios"
            loading={isSaving}
            disabled={!canSave}
            onPress={() => void save()}
          />
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

function createProfileFieldEditStyles(t: Theme) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      justifyContent: "center",
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing.xl,
    },
    surface: {
      backgroundColor: t.colors.backgroudWhite,
      borderRadius: t.borders.md,
      padding: t.spacing.lg,
      gap: t.spacing.md,
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 5,
      elevation: 2,
    },
    iconBadge: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: "rgba(131,163,30,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    titleBlock: {
      gap: t.spacing.xs,
    },
    inputContainer: {
      marginBottom: 0,
    },
  });
}
