import Button from "@/src/components/button/Button";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";
import { useConversationActions } from "@/src/components/conversation/useConversationActions";
import { usePendingRatings } from "@/src/components/conversation/usePendingRatings";
import LoadingState from "@/src/components/loading/LoadingState";
import MarketplaceCardFrame from "@/src/components/marketplaceHub/MarketplaceCardFrame";
import StandaloneListEmptyState from "@/src/components/standaloneList/StandaloneListEmptyState";
import { Text } from "@/src/components/Text";
import { getCurrentUserConversationView, type ConversationView } from "@/src/services/conversation.service";
import type { PendingRating } from "@/src/services/conversation.rating.helpers";
import { useTheme } from "@/src/themes";
import { showError, showInfo } from "@/src/utils/useToast";
import { formatOfferTotalLabel } from "@/src/utils/conversationOfferPrice";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function PendingRatingRow({ item, actionLabel, loading, disabled, onPress }: {
  item: PendingRating; actionLabel: string; loading: boolean; disabled: boolean; onPress: () => void;
}) {
  const date = item.closedAt ? new Date(item.closedAt).toLocaleDateString("es-CR", {
    day: "numeric", month: "short", year: "numeric",
  }) : null;
  return <MarketplaceCardFrame
    title={item.requestTitle}
    headerMeta={<Text variant="small" color="textMedium">{item.targetName}</Text>}
    subtitle={[item.outcomeLabel, date].filter(Boolean).join(" · ")}
    glassSurface
    prominentTitle
    fullText
    footerDivider
    accessibilityLabel={[item.targetName, item.requestTitle, item.outcomeLabel, date, item.priceLabel, actionLabel].filter(Boolean).join(". ")}
    body={item.priceLabel ? <Text variant="subtitle" color="primary">{formatOfferTotalLabel(item.priceLabel)}</Text> : null}
    footerLeft={<Button title={actionLabel} icon="star" loading={loading} disabled={disabled} onPress={onPress} />}
  />;
}

export default function PendingRatingsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { data, error, isLoading, profileId, refresh, loadMore } = usePendingRatings();
  const [selected, setSelected] = useState<{ view: ConversationView; profileId: string } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const generation = useRef(0);
  const focused = useRef(false);
  const opening = useRef(false);
  const pending = useRef<PendingRating | null>(null);
  const view = selected?.profileId === profileId ? selected.view : null;

  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; generation.current += 1; pending.current = null; setSelected(null); };
  }, []));
  useEffect(() => { generation.current += 1; setSelected(null); }, [profileId]);

  const refreshSelected = useCallback(async () => {
    const request = generation.current;
    const result = view ? await getCurrentUserConversationView(view.conversation.id) : null;
    if (request !== generation.current || !focused.current) return;
    if (result?.ok && result.profileId === profileId) setSelected({ view: result.data, profileId: result.profileId });
    else setSelected(null);
    await refresh();
  }, [profileId, refresh, view]);
  const { handleActionPress, isExecutingAction } = useConversationActions({
    conversationId: view?.conversation.id ?? null, profileId, conversationView: view,
    refreshConversation: refreshSelected,
  });
  useEffect(() => {
    if (!view) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshSelected();
    });
    return () => subscription.remove();
  }, [refreshSelected, view]);

  useEffect(() => {
    const item = pending.current;
    if (!view || !item || view.conversation.id !== item.conversationId) return;
    pending.current = null;
    const action = view.actions.find((candidate) => candidate.id === item.actionId &&
      candidate.confirmation?.inputs.some((input) => input.kind === "rating"));
    if (action) handleActionPress(action);
    else { showInfo("Esta calificación ya no está pendiente."); void refresh(); }
  }, [handleActionPress, refresh, view]);

  const openRating = async (item: PendingRating) => {
    if (opening.current || isExecutingAction) return;
    opening.current = true;
    setOpeningId(item.conversationId);
    const request = ++generation.current;
    try {
      const result = await getCurrentUserConversationView(item.conversationId);
      if (request !== generation.current || !focused.current) return;
      if (!result.ok) { showError("No se pudo abrir la calificación", result.error.message); return; }
      if (result.profileId !== profileId) return;
      pending.current = item;
      setSelected({ view: result.data, profileId: result.profileId });
    } finally { opening.current = false; setOpeningId(null); }
  };

  return <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={isLoading && !!data} onRefresh={() => void refresh()} tintColor={t.colors.primary} />}
    contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT + t.spacing.md,
      paddingBottom: insets.bottom + t.spacing.lg, gap: t.spacing.md }}>
    {data && data.total > 0 ? <Text variant="small" color="textMedium" accessibilityLiveRegion="polite">{data.ui.countLabel}</Text> : null}
    {error ? <StandaloneListEmptyState icon="alert-circle" title="No pudimos cargar las calificaciones"
      description="Intenta de nuevo. Tus calificaciones pendientes se conservan."
      actionLabel="Reintentar" onAction={() => void refresh()} /> : null}
    {!data && isLoading ? <LoadingState variant="inline" label="Cargando calificaciones..." /> : null}
    {data?.items.map((item) => <PendingRatingRow key={item.conversationId} item={item}
      actionLabel={data.ui.actionLabel} loading={openingId === item.conversationId}
      disabled={openingId !== null || isExecutingAction} onPress={() => void openRating(item)} />)}
    {data?.hasMore ? <Button variant="white" title="Cargar más" loading={isLoading} onPress={() => void loadMore()} /> : null}
    {data && data.total === 0 && !error ? <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: t.spacing.lg }}>
      <StandaloneListEmptyState icon="star" title={data.ui.emptyTitle}
        description={data.ui.emptyDescription} actionLabel="Ir a Inicio" actionIcon="arrow-right"
        onAction={() => router.replace("/(tabs)")} />
    </View> : null}
  </ScrollView>;
}
