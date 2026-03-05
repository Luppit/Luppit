import RoleGate from "@/src/components/role/RoleGate";
import { Text } from "@/src/components/Text";
import React from "react";
import { View } from "react-native";

export default function ChatsScreen() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <Text variant="subtitle">Navbar</Text>
      <RoleGate
        loading={<Text>Cargando contenido...</Text>}
        buyer={<Text style={{ fontSize: 28 }}>Chats Buyer</Text>}
        seller={<Text style={{ fontSize: 28 }}>Chats Seller</Text>}
      />
    </View>
  );
}
