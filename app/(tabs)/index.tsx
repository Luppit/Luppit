import Button from "@/src/components/button/Button";
import ProductCard from "@/src/components/productCard/ProductCard";
import RoleGate from "@/src/components/role/RoleGate";
import { Text } from "@/src/components/Text";
import { purchaseRequestExample } from "@/src/mocks/purchaseRequest.mock";
import { getCurrentUserPurchaseRequest } from "@/src/services/purchase.request.service";
import { useTheme } from "@/src/themes";
import { Asset } from "expo-asset";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, View } from "react-native";
import { SvgUri } from "react-native-svg";

export default function HomeScreen() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, padding: t.spacing.xs }}>
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
      <View style={{ flex: 1 }}>
        <ProductCard
          title={purchaseRequestExample.title ?? "Solicitud"}
          subtitle={purchaseRequestExample.category_name ?? "-"}
          views={12}
          statusLabel="Activa"
          offersLabel="# ofertas"
          onPress={() =>
            router.push({
              pathname: "/(detail)/purchase-request",
              params: {
                title: purchaseRequestExample.title ?? "Detalle de solicitud",
                purchaseRequest: JSON.stringify(purchaseRequestExample),
              },
            })
          }
        />

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
      </View>
    );
  }

  return (
    <Text>{categoryName}</Text>
  );
}

function SellerHomeContent() {
  const t = useTheme();
  const emptyBoxAsset = Asset.fromModule(
    require("../../assets/images/empty_box.svg"),
  );

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        paddingBottom: 96,
      }}
    >
      {emptyBoxAsset?.uri ? (
        <SvgUri uri={emptyBoxAsset.uri} width={240} height={220} />
      ) : (
        <Image
          source={require("../../assets/images/icon.png")}
          style={{ width: 84, height: 84 }}
          resizeMode="contain"
        />
      )}
      <Text align="center" variant="body">
        Aún no hay solicitudes en ninguna categoría, pero tranquilo: ¡las
        oportunidades están por llegar!
      </Text>
      <View style={{ width: "100%" }}>
        <Button
          variant="dark"
          title="Abrir solicitud mock"
          onPress={() =>
            router.push({
              pathname: "/(conversation)/chat",
              params: {
                purchaseRequest: JSON.stringify(purchaseRequestExample),
                showComposer: "false",
                showActionButtons: "true",
                actionButtons: JSON.stringify([
                  {
                    id: "discard",
                    label: "Descartar",
                    icon: "trash-2",
                    backgroundColorKey: "backgroudWhite",
                    textColorKey: "error",
                    iconColorKey: "error",
                  },
                  {
                    id: "offer",
                    label: "Ofertar",
                    icon: "tag",
                    backgroundColorKey: "primary",
                    textColorKey: "backgroudWhite",
                    iconColorKey: "backgroudWhite",
                  },
                ]),
              },
            })
          }
        />
      </View>
    </View>
  );
}
