import Button from "@/src/components/button/Button";
import GlassSurface from "@/src/components/glass/GlassSurface";
import { GroupedListRow, GroupedListSection } from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import { DetailTopBarMenuContext } from "@/src/components/navbar/DetailTopBarMenuContext";
import { normalizeOptionalIcon, normalizeStyleFlags } from "@/src/components/conversation/useConversationActions";
import MarketplaceCardFrame from "@/src/components/marketplaceHub/MarketplaceCardFrame";
import StatusChip from "@/src/components/statusChip/StatusChip";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import { getCurrentSellerPurchaseOffers, type SellerPurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import { addCurrentSellerPurchaseRequestFavorite, getPurchaseRequestById,
  removeCurrentSellerPurchaseRequestFavorite, type PurchaseRequest } from "@/src/services/purchase.request.service";
import { discardCurrentSellerRequestOffers, getCurrentSellerRequestOffersMenu,
  getOrCreateCurrentSellerOfferSeedConversation } from "@/src/services/seller.request.offers.service";
import type { ConversationViewAction } from "@/src/services/conversation.service";
import { openPopup } from "@/src/services/popup.service";
import { useTheme } from "@/src/themes";
import { formatConversationOfferPrice, formatConversationOfferTotal, formatOfferAmount } from "@/src/utils/conversationOfferPrice";
import { showError, showInfo, showSuccess } from "@/src/utils/useToast";
import { buildPurchaseRequestUrl } from "@/src/utils/purchaseRequestLink";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Platform, ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

const ADD_OFFER_BAR_HEIGHT = 60;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function SellerRequestOffersScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = React.useMemo(() => StyleSheet.create({
    screen: { flex: 1 },
    scroll: { flex: 1 },
    content: { gap: t.spacing.lg, paddingTop: insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT + t.spacing.md,
      paddingBottom: insets.bottom + t.spacing.xl },
    contentWithAction: { paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 10 : 12)
      + ADD_OFFER_BAR_HEIGHT + t.spacing.xl + t.spacing.md },
    summaryCard: { ...createRoundedSurfaceStyle(t), padding: t.spacing.md },
    offersSection: { gap: t.spacing.md },
    offersList: { gap: t.spacing.md },
    sectionTitle: { paddingLeft: t.spacing.md },
    actionBar: { position: "absolute", left: 0, right: 0,
      bottom: Math.max(insets.bottom, Platform.OS === "android" ? 10 : 12), alignItems: "center" },
    actionGlass: { width: "100%", maxWidth: 430 },
    actionGlassClip: { borderRadius: t.glass.radius.nav },
    actionGlassContent: { padding: t.spacing.sm },
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
  const [menuActions, setMenuActions] = React.useState<ConversationViewAction[]>([]);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const setTopBarMenu = React.useContext(DetailTopBarMenuContext);
  const focusedRef = React.useRef(false);
  const loadVersionRef = React.useRef(0);
  const executingRef = React.useRef(false);

  const loadOffers = React.useCallback(async () => {
    if (!purchaseRequestId) return;
    const loadVersion = ++loadVersionRef.current;
    const [requestResult, offersResult, menuResult] = await Promise.all([
      getPurchaseRequestById(purchaseRequestId),
      getCurrentSellerPurchaseOffers(undefined, "newly_listed", "all"),
      getCurrentSellerRequestOffersMenu(purchaseRequestId),
    ]);
    if (!focusedRef.current || loadVersion !== loadVersionRef.current) return;
    if (requestResult?.ok) setRequest(requestResult.data);
    if (offersResult.ok) {
      setOffers(offersResult.data.filter((offer) => offer.purchase_request_id === purchaseRequestId));
    } else {
      showError("No se pudieron cargar las ofertas", offersResult.error.message);
    }
    setMenuActions(menuResult.ok ? menuResult.data : []);
    if (!menuResult.ok) showError("No se pudieron cargar las opciones", menuResult.error.message);
    setLoading(false);
  }, [purchaseRequestId]);

  useFocusEffect(React.useCallback(() => {
    focusedRef.current = true;
    setIsExecuting(executingRef.current);
    if (purchaseRequestId) {
      setLoading(true);
      void loadOffers();
    } else {
      setLoading(false);
    }
    return () => { focusedRef.current = false; loadVersionRef.current += 1; };
  }, [loadOffers, purchaseRequestId]));

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

  const executeMenuAction = React.useCallback(async (action: ConversationViewAction) => {
    if (!purchaseRequestId || executingRef.current) return false;
    executingRef.current = true;
    setIsExecuting(true);
    try {
      if (action.executor?.target === "public.seller_discard_request_offers") {
        const result = await discardCurrentSellerRequestOffers(purchaseRequestId);
        if (!result.ok) {
          showError("No se pudieron descartar las ofertas", result.error.message);
          return false;
        }
        const message = `Descartadas: ${result.data.discardedCount}. Omitidas: ${result.data.skippedCount}.`;
        if (result.data.discardedCount > 0) showSuccess("Ofertas descartadas", message);
        else showInfo("No se descartaron ofertas", message);
        await loadOffers();
        return true;
      }
      const result = action.executor?.target === "request.favorite.add"
        ? await addCurrentSellerPurchaseRequestFavorite(purchaseRequestId)
        : await removeCurrentSellerPurchaseRequestFavorite(purchaseRequestId);
      if (!result.ok) {
        showError("No se pudo actualizar el favorito", result.error.message);
        return false;
      }
      await loadOffers();
      return true;
    } finally {
      executingRef.current = false;
      if (focusedRef.current) setIsExecuting(false);
    }
  }, [loadOffers, purchaseRequestId]);

  const openMenuAction = React.useCallback((action: ConversationViewAction) => {
    if (executingRef.current || !purchaseRequestId) return;
    const target = action.executor?.target;
    if (target === "request.category") {
      openCategoryInfo();
      return;
    }
    if (target === "request.share") {
      const url = buildPurchaseRequestUrl(purchaseRequestId);
      const title = request?.title?.trim() || "Solicitud en Luppit";
      void Share.share({ message: `${title}\n${url}`, url, title })
        .catch(() => showError("No se pudo compartir", "Intenta nuevamente."));
      return;
    }
    if (target === "request.favorite.add" || target === "request.favorite.remove") {
      void executeMenuAction(action);
      return;
    }
    if (target !== "public.seller_discard_request_offers" || !action.confirmation) return;
    const confirmation = action.confirmation;
    const colorKey = normalizeStyleFlags(confirmation.confirm_style_code).isDanger ? "error" : "textDark";
    openPopup({
      type: "summary", title: confirmation.title, icon: normalizeOptionalIcon(action.icon),
      description: confirmation.description_template,
      rows: confirmation.fields.map((field) => ({ label: field.label, value: field.value })),
      actions: [
        { id: "keep-offers", label: confirmation.cancel_label,
          icon: normalizeOptionalIcon(confirmation.cancel_icon), backgroundColorKey: "backgroudWhite",
          textColorKey: "textDark", iconColorKey: "textDark" },
        { id: "discard-offers", label: confirmation.confirm_label,
          icon: normalizeOptionalIcon(confirmation.confirm_icon), backgroundColorKey: "backgroudWhite",
          textColorKey: colorKey, iconColorKey: colorKey, onPress: () => executeMenuAction(action) },
      ],
    });
  }, [executeMenuAction, openCategoryInfo, purchaseRequestId, request?.title]);

  useFocusEffect(React.useCallback(() => {
    if (!setTopBarMenu) return;
    setTopBarMenu(!loading && menuActions.length > 0 ? {
      onPress: () => openPopup({ options: menuActions.map((action) => ({
        id: action.id, label: action.label, helperText: action.helper_text,
        icon: normalizeOptionalIcon(action.icon),
        textColorKey: normalizeStyleFlags(action.style_code).isDanger ? "error" : "textDark",
        iconColorKey: normalizeStyleFlags(action.style_code).isDanger ? "error" : "textDark",
        onPress: () => openMenuAction(action),
      })) }),
      accessibilityLabel: "Opciones de solicitud", disabled: isExecuting, testID: "seller-request-options",
    } : null);
    return () => setTopBarMenu(null);
  }, [isExecuting, loading, menuActions, openMenuAction, setTopBarMenu]));

  const canAddOffer = request?.status === "active" && offers.length > 0;

  if (loading) return <View style={{ paddingTop: insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT }}>
    <LoadingState label="Cargando ofertas..." />
  </View>;

  return (
    <View style={s.screen}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, canAddOffer && s.contentWithAction]}>
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
        </View>
      </ScrollView>
      {canAddOffer ? (
        <View style={s.actionBar}>
          <GlassSurface variant="nav" blur="nav" style={s.actionGlass}
            clipStyle={s.actionGlassClip} contentStyle={s.actionGlassContent}>
            <Button title="Agregar otra oferta" icon="plus" onPress={() => void addOffer()} />
          </GlassSurface>
        </View>
      ) : null}
    </View>
  );
}
