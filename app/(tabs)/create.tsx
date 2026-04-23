import RoleGate from "@/src/components/role/RoleGate";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import { Redirect } from "expo-router";
import React from "react";
import { View } from "react-native";

export default function CreateScreen() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, padding: t.spacing.md, gap: t.spacing.md }}>
      <RoleGate
        loading={<Text>Cargando contenido...</Text>}
        buyer={<Redirect href="/(chat)/chat" />}
        seller={<Text variant="title">Create Seller</Text>}
      />
    </View>
  );
}
