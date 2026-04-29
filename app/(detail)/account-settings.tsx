import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import {
  BuyerProfileOverview,
  getCurrentBuyerProfileOverview,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

export default function AccountSettingsScreen() {
  const t = useTheme();
  const s = useMemo(() => createAccountSettingsStyles(t), [t]);
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

  const profile = overview?.profile;
  const preset = overview?.buyerHomePreset;

  if (isLoading) {
    return (
      <View style={s.loadingBox}>
        <ActivityIndicator color={t.colors.primary} />
        <Text color="stateAnulated">Cargando configuración...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <SettingsSection title="Datos personales">
        <SettingsRow
          label="Nombre"
          value={profile?.name || "Sin nombre"}
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
        <SettingsRow
          label="Documento de identificación"
          value={profile?.id_document || "Sin documento"}
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
        <SettingsRow
          label="Correo"
          value={profile?.email || "Sin correo verificado"}
          onPress={() =>
            router.push({
              pathname: "/(modal)/email-setup",
              params: { title: "Cambiar correo" },
            })
          }
        />
      </SettingsSection>

      <SettingsSection title="Preferencias">
        <SettingsRow
          label="Vista de inicio"
          value={preset?.name || "Default"}
          description={preset?.description ?? null}
          onPress={() =>
            router.push({
              pathname: "/(detail)/home-preset",
              params: { title: "Vista de inicio", hideMenu: "true" },
            })
          }
        />
      </SettingsSection>
    </ScrollView>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const s = useMemo(() => createAccountSettingsStyles(t), [t]);

  return (
    <View style={s.section}>
      <Text variant="subtitle">{title}</Text>
      <View style={s.rowGroup}>{children}</View>
    </View>
  );
}

function SettingsRow({
  label,
  value,
  description,
  onPress,
}: {
  label: string;
  value: string;
  description?: string | null;
  onPress?: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createAccountSettingsStyles(t), [t]);
  const content = (
    <>
      <View style={s.rowText}>
        <Text>{label}</Text>
        <Text color="stateAnulated" maxLines={1}>
          {value}
        </Text>
        {description ? (
          <Text variant="caption" color="stateAnulated" maxLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {onPress ? <Icon name="arrow-right" size={18} color={t.colors.stateAnulated} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={s.row}>
        {content}
      </Pressable>
    );
  }

  return <View style={s.row}>{content}</View>;
}

function createAccountSettingsStyles(t: Theme) {
  return StyleSheet.create({
    content: {
      gap: t.spacing.lg,
      paddingTop: t.spacing.sm,
      paddingBottom: t.spacing.xl,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
    },
    section: {
      gap: t.spacing.sm,
    },
    rowGroup: {
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
    },
    row: {
      minHeight: 64,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
  });
}
