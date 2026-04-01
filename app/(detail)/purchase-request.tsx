import HintModal from "@/src/components/hintModal/HintModal";
import { Icon } from "@/src/components/Icon";
import OfferCard, {
  OfferCardTimelineItem,
} from "@/src/components/offerCard/OfferCard";
import { Text } from "@/src/components/Text";
import { purchaseRequestExample } from "@/src/mocks/purchaseRequest.mock";
import {
  getAcceptedConversationByPurchaseRequestId,
  getConversationByPurchaseOfferId,
  getConversationTimeline,
} from "@/src/services/conversation.service";
import {
  getCachedPurchaseOffersByPurchaseRequestId,
  getPurchaseOffersByPurchaseRequestId,
  PurchaseOfferCardData,
} from "@/src/services/purchase.offer.service";
import { getPurchaseRequestVisualizationCount } from "@/src/services/purchase.request.visualization.service";
import { PurchaseRequest } from "@/src/services/purchase.request.service";
import { useTheme } from "@/src/themes";
import { Asset } from "expo-asset";
import { Image } from "expo-image";
import { router, useGlobalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SvgUri } from "react-native-svg";
import { lucideIcons, LucideIconName } from "@/src/icons/lucide";

function parsePurchaseRequestParam(
  raw: string | string[] | undefined,
): PurchaseRequest | null {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    return JSON.parse(value) as PurchaseRequest;
  } catch {
    return null;
  }
}

export default function PurchaseRequestDetailScreen() {
  const t = useTheme();
  const [showCategoryHint, setShowCategoryHint] = useState(false);
  const [offers, setOffers] = useState<PurchaseOfferCardData[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedOfferTimeline, setSelectedOfferTimeline] = useState<OfferCardTimelineItem[]>(
    []
  );
  const [selectedOfferLoading, setSelectedOfferLoading] = useState(false);
  const [viewsCount, setViewsCount] = useState(0);
  const params = useGlobalSearchParams<{
    purchaseRequest?: string | string[];
  }>();
  const purchaseRequest =
    parsePurchaseRequestParam(params.purchaseRequest) ?? purchaseRequestExample;
  const isAcceptedRequest =
    (purchaseRequest.status ?? "").trim().toLowerCase() === "offer_accepted";
  const offersCount = offers.length;
  const noOffersAsset = Asset.fromModule(
    require("../../assets/images/no_offers_request.svg"),
  );
  const displayedOffers = useMemo(() => {
    if (!isAcceptedRequest) return offers;
    if (!selectedOfferId) return [];
    return offers.filter((offer) => offer.id === selectedOfferId);
  }, [isAcceptedRequest, offers, selectedOfferId]);

  const displayedOffersCount = displayedOffers.length;

  useEffect(() => {
    let active = true;

    const loadOffers = async () => {
      const cachedOffers = getCachedPurchaseOffersByPurchaseRequestId(
        purchaseRequest.id,
      );
      if (cachedOffers) {
        setOffers(cachedOffers);
        setOffersLoading(false);
        return;
      }

      setOffersLoading(true);
      const result = await getPurchaseOffersByPurchaseRequestId(
        purchaseRequest.id,
      );
      if (!active) return;

      if (result.ok) setOffers(result.data);
      else setOffers([]);

      setOffersLoading(false);
    };

    void loadOffers();

    return () => {
      active = false;
    };
  }, [purchaseRequest.id]);

  useEffect(() => {
    let active = true;

    const resolveSelectedOffer = async () => {
      if (!isAcceptedRequest) {
        setSelectedOfferId(null);
        setSelectedOfferTimeline([]);
        setSelectedOfferLoading(false);
        return;
      }

      setSelectedOfferLoading(true);
      const acceptedConversation = await getAcceptedConversationByPurchaseRequestId(
        purchaseRequest.id
      );

      if (!active) return;

      if (!acceptedConversation || acceptedConversation.ok === false) {
        setSelectedOfferId(null);
        setSelectedOfferTimeline([]);
        setSelectedOfferLoading(false);
        return;
      }

      const acceptedOfferId = acceptedConversation.data.purchase_offer_id ?? null;
      setSelectedOfferId(acceptedOfferId);

      const timelineResult = await getConversationTimeline(acceptedConversation.data.id);
      if (!active) return;

      if (!timelineResult.ok) {
        setSelectedOfferTimeline([]);
        setSelectedOfferLoading(false);
        return;
      }

      const timeline = timelineResult.data.map((step) => {
        const rawIcon = (step.icon ?? "").trim();
        const iconName = (rawIcon in lucideIcons ? rawIcon : "circle-help") as LucideIconName;

        return {
          code: step.status_code,
          label: step.label,
          icon: iconName,
          reached_at: step.reached_at,
          reached_at_label: step.reached_at_label,
          pre_label: step.pre_label,
          is_completed: step.is_completed,
          is_next: step.is_next,
        } satisfies OfferCardTimelineItem;
      });

      setSelectedOfferTimeline(timeline);
      setSelectedOfferLoading(false);
    };

    void resolveSelectedOffer();
    return () => {
      active = false;
    };
  }, [isAcceptedRequest, purchaseRequest.id]);

  const openOfferConversation = async (purchaseOfferId: string) => {
    const conversation = await getConversationByPurchaseOfferId(purchaseOfferId);
    if (!conversation || conversation.ok === false) return;

    router.push({
      pathname: "/(conversation)/offer",
      params: {
        conversationId: conversation.data.id,
        title: purchaseRequest.title ?? "Conversación",
      },
    });
  };

  useEffect(() => {
    let active = true;

    const loadVisualizations = async () => {
      const result = await getPurchaseRequestVisualizationCount(purchaseRequest.id);
      if (!active) return;
      setViewsCount(result.ok ? result.data : 0);
    };

    void loadVisualizations();
    return () => {
      active = false;
    };
  }, [purchaseRequest.id]);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={{ flex: 1, paddingTop: t.spacing.md }}>
        <View>
          <Text variant="body">{purchaseRequest.summary_text ?? ""}</Text>
        </View>

        <View
          style={{
            marginTop: t.spacing.lg,
            alignItems: "flex-end",
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: t.spacing.xs,
          }}
        >
          <Text color="stateAnulated">Visualizaciones:</Text>
          <Icon name="eye" size={20} color={t.colors.stateAnulated} />
          <Text color="stateAnulated">{String(viewsCount)}</Text>
        </View>

        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: t.colors.border,
            marginTop: t.spacing.md,
          }}
        />

        <View style={{ marginTop: t.spacing.lg, gap: t.spacing.sm }}>
          <Text variant="subtitle">Categoría:</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: t.spacing.xs,
            }}
          >
            <Text variant="titleRegular">{purchaseRequest.category_name ?? "-"}</Text>
            <Pressable hitSlop={8} onPress={() => setShowCategoryHint(true)}>
              <Icon name="info" size={18} color={t.colors.primary} />
            </Pressable>
          </View>
        </View>

        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: t.colors.border,
            marginTop: t.spacing.lg,
          }}
        />

        <View style={{ marginTop: t.spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: isAcceptedRequest ? "flex-start" : "space-between",
            }}
          >
            <Text color="stateAnulated" variant="subtitle">
              {isAcceptedRequest ? "Oferta seleccionada" : `Ofertas (${offersCount}):`}
            </Text>
            {!isAcceptedRequest ? (
              <View style={{ flexDirection: "row", gap: t.spacing.sm }}>
                <Icon
                  name="sliders-horizontal"
                  size={18}
                  color={t.colors.stateAnulated}
                />
                <Icon
                  name="arrow-up-down"
                  size={18}
                  color={t.colors.stateAnulated}
                />
              </View>
            ) : null}
          </View>

          {offersLoading ? (
            <View style={{ marginTop: t.spacing.lg }}>
              <Text color="stateAnulated">Cargando ofertas...</Text>
            </View>
          ) : isAcceptedRequest && selectedOfferLoading ? (
            <View style={{ marginTop: t.spacing.lg }}>
              <Text color="stateAnulated">Cargando oferta seleccionada...</Text>
            </View>
          ) : displayedOffersCount === 0 ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                marginTop: t.spacing.xl,
                gap: t.spacing.md,
              }}
            >
              <Text color="stateAnulated" align="center">
                {isAcceptedRequest
                  ? "No se encontró la oferta seleccionada para esta solicitud."
                  : "Cuando recibas una oferta, aparecerá aquí."}
              </Text>
              {noOffersAsset?.uri ? (
                <SvgUri uri={noOffersAsset.uri} width={260} height={340} />
              ) : (
                <Image
                  source={require("../../assets/images/no_offers_request.svg")}
                  style={{ width: 260, height: 340 }}
                  contentFit="contain"
                />
              )}
            </View>
          ) : (
            <View style={{ marginTop: t.spacing.lg, gap: t.spacing.md }}>
              {displayedOffers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  connectLabel={isAcceptedRequest ? "Ver chat" : "Conectar"}
                  timeline={
                    isAcceptedRequest && offer.id === selectedOfferId
                      ? selectedOfferTimeline
                      : undefined
                  }
                  onConnect={() => void openOfferConversation(offer.id)}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <HintModal
        visible={showCategoryHint}
        text={purchaseRequest.category_path ?? "-"}
        onClose={() => setShowCategoryHint(false)}
      />
    </ScrollView>
  );
}
