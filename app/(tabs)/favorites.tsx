import RoleGate from "@/src/components/role/RoleGate";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React from "react";
import { View } from "react-native";

export default function FavoritesScreen() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, padding: t.spacing.md, gap: t.spacing.md }}>
      <RoleGate
        loading={<Text>Cargando contenido...</Text>}
        buyer={<Text variant="title">Favorites Buyer</Text>}
        seller={<Text variant="title">Favorites Seller</Text>}
      />
    </View>
  );
}
