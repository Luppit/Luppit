import { Icon } from "@/src/components/Icon";
import Button from "@/src/components/button/Button";
import { GroupedListRow, GroupedListSection } from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import MarketplaceCardFrame from "@/src/components/marketplaceHub/MarketplaceCardFrame";
import StatusChip from "@/src/components/statusChip/StatusChip";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import { getCurrentSellerPurchaseOffers, type SellerPurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import { getPurchaseRequestById, type PurchaseRequest } from "@/src/services/purchase.request.service";
import { getOrCreateCurrentSellerOfferSeedConversation } from "@/src/services/seller.request.offers.service";
import { useTheme } from "@/src/themes";
import { formatConversationOfferPrice, formatConversationOfferTotal, formatOfferAmount } from "@/src/utils/conversationOfferPrice";
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
    content: { gap: t.spacing.lg, paddingTop: insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT + t.spacing.md,
      paddingBottom: insets.bottom + t.spacing.xl },
    summaryCard: { ...createRoundedSurfaceStyle(t), padding: t.spacing.md },
    offersSection: { gap: t.spacing.md },
    offersList: { gap: t.spacing.md },
    sectionTitle: { paddingLeft: t.spacing.md },
    action: { ...createRoundedSurfaceStyle(t), borderWidth: 1, borderColor: t.colors.textMedium,
      minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: t.spacing.sm, padding: t.spacing.sm },
    optionBody: { gap: t.spacing.md },
    pricing: { gap: t.spacing.sm },
    priceRow: { flexWrap: "wrap", flexDirection: "row", alignItems: "center",
      justifyContent: "space-between", gap: t.spacing.md },
    priceLabel: { flexShrink: 1 },
    priceValue: { flexShrink: 1, textAlign: "right", marginLeft: "auto" },
    price: { color: t.colors.primary, fontFamily: t.typography.subtitle.fontFamily },
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

  const openCategoryInfo = React.useCallback(() => {
    if (!purchaseRequestId) return;
    router.push({ pathname: "/(detail)/category-info", params: {
      title: "Información de categoría", hideMenu: "true", purchaseRequestId,
    } });
  }, [purchaseRequestId]);

  if (loading) return <View style={{ paddingTop: insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT }}>
    <LoadingState label="Cargando ofertas..." />
  </View>;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      {request?.summary_text ? (
        <View style={s.summaryCard}>
          <Text variant="body" color="textMedium">{request.summary_text}</Text>
        </View>
      ) : null}

      {request ? (
        <GroupedListSection title="Categoría">
          <GroupedListRow
            icon="tag"
            label={request.category_name ?? "Sin categoría"}
            description="Ver cómo Luppit usa esta categoría"
            showSeparator={false}
            onPress={openCategoryInfo}
          />
        </GroupedListSection>
      ) : null}

      <View style={s.offersSection}>
        <Text variant="small" color="textMedium" style={s.sectionTitle}>
          Tus ofertas ({offers.length}):
        </Text>
        {offers.length === 0 ? (
          <Text variant="body" color="textMedium">No hay ofertas disponibles para esta solicitud.</Text>
        ) : null}
        <View style={s.offersList}>
          {offers.map((offer, index) => {
            const priceContext = {
              ...offer,
              offer_price_amount: offer.price,
              offer_price_basis: offer.price_basis,
              offer_quantity_offered: offer.quantity_offered,
            };
            const formattedPrice = formatConversationOfferPrice(priceContext) ?? "Precio no disponible";
            const unitPrice = offer.price_basis === "UNIT"
              ? formatOfferAmount(offer.price, offer.offer_currency_code)
              : null;
            const productTotal = offer.price_basis === "UNIT" || offer.price_basis === "TOTAL"
              ? formatConversationOfferTotal(priceContext)
              : null;
            const conversationId = offer.conversation_id;
            return (
              <MarketplaceCardFrame
                key={offer.id}
                title={`Oferta ${index + 1}`}
                headerRight={offer.conversation_status_label ? (
                  <StatusChip label={offer.conversation_status_label}
                    styleCode={offer.conversation_status_style_code} allowWrap />
                ) : null}
                body={<View style={s.optionBody}>
                  <Text variant="body" color="textMedium">{offer.description?.trim() || "Sin descripción"}</Text>
                  <View style={s.pricing}>
                    {productTotal ? (
                      <>
                        {unitPrice ? (
                          <View style={s.priceRow}>
                            <Text variant="small" color="textMedium" style={s.priceLabel}>
                              {offer.quantity_offered != null
                                ? `${offer.quantity_offered} ${offer.quantity_offered === 1 ? "unidad" : "unidades"}`
                                : "Precio por unidad"}
                            </Text>
                            <Text variant="small" color="textMedium" style={s.priceValue}>{unitPrice} c/u</Text>
                          </View>
                        ) : null}
                        <View style={s.priceRow}>
                          <Text variant="small" color="textMedium" style={s.priceLabel}>Total de productos</Text>
                          <Text variant="body" style={[s.priceValue, s.price]}>{productTotal}</Text>
                        </View>
                      </>
                    ) : (
                      <Text variant="body" style={s.price}>{formattedPrice}</Text>
                    )}
                  </View>
                </View>}
                footerLeft={<Button title="Ver conversación" icon="message-circle"
                  disabled={!conversationId} onPress={conversationId ? () => router.push({
                    pathname: "/(conversation)/offer", params: {
                      conversationId,
                      title: request?.title ?? offer.request_title ?? "Conversación",
                    },
                  }) : undefined} />}
                fullText
                accessibilityLabel={`Oferta ${index + 1}. ${offer.description || "Sin descripción"}. ${formattedPrice}.`}
              />
            );
          })}
        </View>
        {request?.status === "active" && offers.length > 0 ? (
          <Pressable style={s.action} onPress={() => void addOffer()} accessibilityRole="button"
            accessibilityLabel="Agregar otra oferta">
            <Icon name="plus" size={20} color={t.colors.textDark} />
            <Text variant="body">Agregar otra oferta</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
