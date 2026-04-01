import RoleGate from "@/src/components/role/RoleGate";
import SellerOfferCard from "@/src/components/sellerOfferCard/SellerOfferCard";
import { Text } from "@/src/components/Text";
import {
  getCurrentSellerPurchaseOffers,
  SellerPurchaseOfferCardData,
} from "@/src/services/purchase.offer.service";
import { getConversationByPurchaseOfferId } from "@/src/services/conversation.service";
import { useTheme } from "@/src/themes";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";
import { showError, showInfo } from "@/src/utils/useToast";

export default function OffersScreen() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, padding: t.spacing.md, gap: t.spacing.md }}>
      <RoleGate
        loading={<Text>Cargando contenido...</Text>}
        buyer={<Text variant="title">Offers Buyer</Text>}
        seller={<SellerOffersContent />}
      />
    </View>
  );
}

function SellerOffersContent() {
  const t = useTheme();
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [offers, setOffers] = React.useState<SellerPurchaseOfferCardData[]>([]);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const openOfferConversation = React.useCallback(
    async (offer: SellerPurchaseOfferCardData) => {
      const conversation = await getConversationByPurchaseOfferId(offer.id);
      if (!conversation) {
        showInfo("Sin conversación", "Esta oferta todavía no tiene conversación.");
        return;
      }
      if (!conversation.ok) {
        showError("No se pudo abrir la conversación", conversation.error.message);
        return;
      }

      router.push({
        pathname: "/(conversation)/offer",
        params: {
          conversationId: conversation.data.id,
          title: offer.request_title ?? "Conversación",
        },
      });
    },
    []
  );

  const loadOffers = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const result = await getCurrentSellerPurchaseOffers();
    if (!isMountedRef.current) return;

    if (result.ok) {
      setOffers(result.data);
    } else {
      setOffers([]);
      setLoadError(result.error.message);
      showError("No se pudieron cargar tus ofertas", result.error.message);
    }

    setIsLoading(false);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadOffers();
      return () => {};
    }, [loadOffers])
  );

  React.useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  if (isLoading) {
    return <Text>Cargando ofertas...</Text>;
  }

  if (offers.length === 0) {
    return (
      <Text color="stateAnulated">
        {loadError
          ? "No se pudieron cargar tus ofertas."
          : "Cuando envíes ofertas, aparecerán aquí."}
      </Text>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        gap: t.spacing.md,
        paddingBottom: t.spacing.xl,
      }}
    >
      {offers.map((offer) => (
        <SellerOfferCard
          key={offer.id}
          offer={offer}
          onPress={() => void openOfferConversation(offer)}
        />
      ))}
    </ScrollView>
  );
}
