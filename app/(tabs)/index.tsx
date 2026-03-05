import Button from "@/src/components/button/Button";
import ProductCard from "@/src/components/ProductCard";
import RoleGate from "@/src/components/role/RoleGate";
import { Text } from "@/src/components/Text";
import { signOut } from "@/src/lib/supabase";
import React from "react";
import { ScrollView, View } from "react-native";

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
      <Text variant="subtitle">Navbar</Text>

      <RoleGate
        loading={<Text>Cargando contenido...</Text>}
        buyer={<BuyerHomeContent />}
        seller={<SellerHomeContent />}
      />

      <Button title="Sign Out" onPress={signOut} />
    </ScrollView>
  );
}

function BuyerHomeContent() {
  return (
    <View style={{ gap: 16 }}>
      <Text variant="subtitle">Inicio Comprador</Text>
      <ProductCard
        title="Compresor Sentra 2023"
        subtitle="Sistema de A/C"
        views={12}
        rating={4.5}
        ratingCount={16}
        timestamp="Justo ahora"
      />
      <ProductCard
        title="Filtro de aceite"
        subtitle="Nissan"
        views={35}
        rating={4.8}
        ratingCount={102}
        timestamp="Hace 5 min"
      />
      <ProductCard
        title="Pastillas de freno"
        subtitle="Toyota"
        views={20}
        rating={4.7}
        ratingCount={45}
        timestamp="Hace 10 min"
      />
    </View>
  );
}

function SellerHomeContent() {
  return (
    <View style={{ gap: 16 }}>
      <Text variant="subtitle">Inicio Vendedor</Text>
      <Text>Tus productos más vistos</Text>
      <ProductCard
        title="Kit de clutch"
        subtitle="Hyundai"
        views={85}
        rating={4.6}
        ratingCount={28}
        timestamp="Actualizado hoy"
      />
      <ProductCard
        title="Amortiguador delantero"
        subtitle="Kia"
        views={64}
        rating={4.9}
        ratingCount={52}
        timestamp="Actualizado hace 1 hora"
      />
    </View>
  );
}
