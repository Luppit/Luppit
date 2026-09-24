import LoadingState from "@/src/components/loading/LoadingState";
import MarketplaceCardFrame from "@/src/components/marketplaceHub/MarketplaceCardFrame";
import StatusChip from "@/src/components/statusChip/StatusChip";
import { Text } from "@/src/components/Text";
import { getCurrentSellerPurchaseOffers, type SellerPurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import { getPurchaseRequestById, type PurchaseRequest } from "@/src/services/purchase.request.service";
import { getOrCreateCurrentSellerOfferSeedConversation } from "@/src/services/seller.request.offers.service";
import { useTheme } from "@/src/themes";
import { formatConversationOfferPrice } from "@/src/utils/conversationOfferPrice";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function SellerRequestOffersScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = React.useMemo(() => StyleSheet.create({
    content: { gap: t.spacing.md, paddingTop: insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT + t.spacing.md,
      paddingBottom: insets.bottom + t.spacing.xl },
    action: { backgroundColor: t.colors.textDark, borderRadius: 14, padding: t.spacing.md,
      alignItems: "center" },
    optionBody: { gap: t.spacing.sm },
  }), [insets.bottom, insets.top, t]);
  const params = useLocalSearchParams<{ purchaseRequestId?: string | string[] }>();
  const purchaseRequestId = firstParam(params.purchaseRequestId);
  const [request, setRequest] = React.useState<PurchaseRequest | null>(null);
  const [offers, setOffers] = React.useState<SellerPurchaseOfferCardData[]>([]);
  const [loading, setLoading] = React.useState(true);

  useFocusEffect(React.useCallback(() => {
    let active = true;
    if (!purchaseRequestId) {
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    void Promise.all([
      getPurchaseRequestById(purchaseRequestId),
      getCurrentSellerPurchaseOffers(undefined, "newly_listed", "all"),
    ]).then(([requestResult, offersResult]) => {
      if (!active) return;
      if (requestResult?.ok) setRequest(requestResult.data);
      if (offersResult.ok) {
        setOffers(offersResult.data.filter((offer) => offer.purchase_request_id === purchaseRequestId));
      } else {
        showError("No se pudieron cargar las ofertas", offersResult.error.message);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [purchaseRequestId]));

  const addOffer = React.useCallback(async () => {
    if (!purchaseRequestId) return;
    const seed = await getOrCreateCurrentSellerOfferSeedConversation(purchaseRequestId);
    if (!seed.ok) {
      showError("No se pudo agregar otra oferta", seed.error.message);
      return;
    }
    router.push({ pathname: "/(modal)/offer", params: {
      title: "Agregar otra oferta", purchaseRequestId,
      conversationId: seed.data.id, mode: "create",
    } });
  }, [purchaseRequestId]);

  if (loading) return <View style={{ paddingTop: insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT }}>
    <LoadingState label="Cargando ofertas..." />
  </View>;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <MarketplaceCardFrame
        title={request?.title ?? offers[0]?.request_title ?? "Solicitud"}
        headerMeta={request?.category_name ? (
          <Text variant="small" color="textMedium">{request.category_name}</Text>
        ) : null}
        body={request?.summary_text ? (
          <Text variant="body" color="textMedium">{request.summary_text}</Text>
        ) : null}
        accessibilityLabel={request?.title ?? "Solicitud"}
        fullText
      />
      <Text variant="subtitle">Tus ofertas ({offers.length})</Text>
      {offers.length === 0 ? (
        <Text variant="body" color="textMedium">No hay ofertas disponibles para esta solicitud.</Text>
      ) : null}
      {offers.map((offer, index) => {
        const price = formatConversationOfferPrice({
          ...offer,
          offer_price_amount: offer.price,
          offer_price_basis: offer.price_basis,
          offer_quantity_offered: offer.quantity_offered,
        });
        return (
          <MarketplaceCardFrame
            key={offer.id}
            title={`Oferta ${index + 1}`}
            headerRight={offer.conversation_status_label ? (
              <StatusChip label={offer.conversation_status_label}
                styleCode={offer.conversation_status_style_code} allowWrap />
            ) : null}
            body={<View style={s.optionBody}>
              <Text variant="body">{offer.description?.trim() || "Sin descripción"}</Text>
              {price ? <Text variant="body">{price}</Text> : null}
              <Text variant="small" color="textMedium">Ver conversación →</Text>
            </View>}
            fullText
            onPress={offer.conversation_id ? () => router.push({
              pathname: "/(conversation)/offer", params: {
                conversationId: offer.conversation_id!,
                title: request?.title ?? offer.request_title ?? "Conversación",
              },
            }) : undefined}
            accessibilityLabel={`${offer.description || "Oferta"}. ${price || ""}. Ver conversación.`}
          />
        );
      })}
      {request?.status === "active" && offers.length > 0 ? (
        <Pressable style={s.action} onPress={() => void addOffer()} accessibilityRole="button"
          accessibilityLabel="Agregar otra oferta">
          <Text variant="body" color="backgroudWhite">Agregar otra oferta</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
