import Button from "@/src/components/button/Button";
import ProductCard from "@/src/components/ProductCard";
import RoleGate from "@/src/components/role/RoleGate";
import { Text } from "@/src/components/Text";
import { getCurrentUserPurchaseRequest } from "@/src/services/purchase.request.service";
import { useTheme } from "@/src/themes";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, View } from "react-native";

export default function HomeScreen() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, padding: t.spacing.md }}>
      <RoleGate
        loading={<Text>Cargando contenido...</Text>}
        buyer={<BuyerHomeContent />}
        seller={<SellerHomeContent />}
      />
    </View>
  );
}

function BuyerHomeContent() {
  const t = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPurchaseRequest = async () => {
      const result = await getCurrentUserPurchaseRequest();
      if (!active) return;

      if (result.ok && result.data) {
        setCategoryName(result.data.category_name ?? null);
      } else {
        setCategoryName(null);
      }

      setIsLoading(false);
    };

    void loadPurchaseRequest();

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return <Text>Cargando contenido...</Text>;
  }

  if (!categoryName) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: t.spacing.md,
          paddingHorizontal: t.spacing.lg,
          paddingBottom: 96,
        }}
      >
        <Image
          source={require("../../assets/images/icon.png")}
          style={{ width: 84, height: 84 }}
          resizeMode="contain"
        />
        <Text align="center" variant="body">
          Cuéntanos qué necesitas y te ayudamos a encontrarlo!
        </Text>
        <View style={{ width: "100%" }}>
          <Button
            variant="dark"
            icon="plus"
            title="Crear nueva solicitud"
            onPress={() => router.push("/(chat)/chat")}
          />
        </View>
      </View>
    );
  }

  return (
    <Text>{categoryName}</Text>
  );
}

function SellerHomeContent() {
  const t = useTheme();
  return (
    <ScrollView contentContainerStyle={{ gap: t.spacing.md, paddingBottom: 120 }}>
      <View style={{ gap: t.spacing.md }}>
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
    </ScrollView>
  );
}
