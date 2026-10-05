import GlassSurface from "@/src/components/glass/GlassSurface";
import { Icon } from "@/src/components/Icon";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { Text } from "@/src/components/Text";
import {
  getCurrentConversationOfferSummary,
  type ConversationView,
} from "@/src/services/conversation.service";
import {
  closePopup,
  openPopup,
  subscribePopup,
  type PopupSummaryConfig,
} from "@/src/services/popup.service";
import { useTheme } from "@/src/themes";
import { formatConversationOfferTotal } from "@/src/utils/conversationOfferPrice";
import { buildConversationOfferSummary } from "@/src/utils/conversationOfferSummary";
import { showError, showInfo } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

type Props = {
  view: ConversationView;
  profileId: string;
  disabled: boolean;
};

export default function ConversationOfferDetails({ view, profileId, disabled }: Props) {
  const t = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const { activeProfile } = useActiveProfile();
  const requestId = useRef(0);
  const summaryPopup = useRef<PopupSummaryConfig | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const presentation = view.presentation;
  const offerId = view.conversation.purchase_offer_id;
  const revision = view.context.offer_revision;
  const selection = view.conversation.selected_fulfillment_catalog_id;
  const showTerms = Boolean(offerId) && (presentation?.show_terms ?? true) && !presentation?.locked;
  const label = presentation?.terms_label || "Resumen";
  const showPrice = presentation ? presentation.show_terms_price === true : true;
  const price = offerId && showPrice ? formatConversationOfferTotal(view.context) : null;
  const sourceKey = [
    view.conversation.id,
    profileId,
    activeProfile?.profile.id,
    offerId,
    revision,
    selection,
    view.conversation.status_code,
    showTerms,
    disabled,
    JSON.stringify(view.actions),
  ].join(":");

  useEffect(() => subscribePopup(({ config }) => {
    if (config !== summaryPopup.current) {
      summaryPopup.current = null;
      if (config) {
        requestId.current += 1;
        setLoadingSummary(false);
      }
    }
  }), []);

  const resetSummary = useCallback(() => {
    requestId.current += 1;
    setLoadingSummary(false);
    if (summaryPopup.current) closePopup();
  }, []);
  useEffect(resetSummary, [sourceKey, resetSummary]);
  useFocusEffect(useCallback(() => resetSummary, [resetSummary]));

  const openSummary = async () => {
    if (loadingSummary || disabled || !offerId || !showTerms) return;
    Keyboard.dismiss();
    const id = ++requestId.current;
    setLoadingSummary(true);
    try {
      const result = await getCurrentConversationOfferSummary(view.conversation.id);
      if (id !== requestId.current) return;
      if (!result.ok) {
        showError("No se pudo cargar el resumen", result.error.message);
        return;
      }
      if (
        result.profileId !== profileId ||
        result.data.conversation.purchase_offer_id !== offerId ||
        result.data.presentation?.show_terms === false ||
        result.data.presentation?.locked
      ) return;
      if (
        result.data.context.offer_revision !== revision ||
        result.data.conversation.selected_fulfillment_catalog_id !== selection
      ) {
        showInfo("La oferta cambió", "Actualiza la conversación y vuelve a abrir el resumen.");
        return;
      }
      const config: PopupSummaryConfig = {
        type: "summary",
        title: "Resumen de la oferta",
        ...buildConversationOfferSummary(result.data.context),
        images: result.images,
        androidBackActionId: "offer-summary-close",
        actions: [{
          id: "offer-summary-close",
          label: "Cerrar",
          icon: "x",
          backgroundColorKey: "backgroudWhite",
          textColorKey: "textDark",
        }],
      };
      summaryPopup.current = config;
      openPopup(config);
    } catch {
      if (id === requestId.current) showError("No se pudo cargar el resumen", "Intenta de nuevo.");
    } finally {
      if (id === requestId.current) setLoadingSummary(false);
    }
  };

  if (!showTerms) return null;

  const stack = price != null && (fontScale > 1.3 || width < 360 || price.length > 12);
  const pillStyle = { borderRadius: t.glass.radius.chip };
  return (
    <View style={{ alignItems: "flex-start" }}>
      <GlassSurface variant="control" style={[pillStyle, { maxWidth: "100%", width: stack ? "100%" : undefined }]} clipStyle={pillStyle}>
        <Pressable
          onPress={openSummary}
          disabled={disabled || loadingSummary}
          accessibilityRole="button"
          accessibilityLabel={price ? `${label}. ${price}` : label}
          accessibilityState={{ disabled: disabled || loadingSummary, busy: loadingSummary }}
          style={({ pressed }) => ({
            minHeight: 48,
            flexDirection: stack ? "column" : "row",
            alignItems: stack ? "stretch" : "center",
            gap: t.spacing.sm,
            paddingHorizontal: t.spacing.md,
            paddingVertical: t.spacing.sm,
            opacity: pressed || disabled ? 0.6 : 1,
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.sm, flexShrink: stack ? 0 : 1 }}>
            <Icon name="file-text" size={20} color={t.colors.textDark} />
            {price ? <Text variant="body" maxFontSizeMultiplier={2} style={{ flexShrink: 1 }}>{price}</Text> : null}
          </View>
          {price ? (
            <View style={{ width: stack ? "100%" : StyleSheet.hairlineWidth,
              height: stack ? StyleSheet.hairlineWidth : 24, backgroundColor: t.colors.border }} />
          ) : null}
          <View style={{ flexShrink: stack ? 0 : 1 }}>
            <Text variant="body" maxFontSizeMultiplier={2} style={{ opacity: loadingSummary ? 0 : 1 }}>
              {label}
            </Text>
            {loadingSummary ? (
              <ActivityIndicator size="small" color={t.colors.textDark}
                style={StyleSheet.absoluteFillObject} />
            ) : null}
          </View>
        </Pressable>
      </GlassSurface>
    </View>
  );
}
