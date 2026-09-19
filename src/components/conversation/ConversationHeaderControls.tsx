import GlassSurface from "@/src/components/glass/GlassSurface";
import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import {
  ConversationView,
  getCurrentConversationOfferSummary,
} from "@/src/services/conversation.service";
import {
  closePopup,
  openPopup,
  PopupSummaryConfig,
  subscribePopup,
} from "@/src/services/popup.service";
import { useTheme } from "@/src/themes";
import { buildConversationOfferSummary } from "@/src/utils/conversationOfferSummary";
import { formatConversationOfferTotal } from "@/src/utils/conversationOfferPrice";
import { showError, showInfo } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConversationActionButtonConfig } from "./ConversationActionButtons";
import ConversationContextControls from "./ConversationContextControls";

type Props = {
  view: ConversationView;
  profileId: string;
  buttons: ConversationActionButtonConfig[];
  disabled: boolean;
  onPress: (id: string) => void;
};

export default function ConversationHeaderControls({
  view,
  profileId,
  buttons,
  disabled,
  onPress,
}: Props) {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { activeProfile } = useActiveProfile();
  const trigger = useRef<View>(null);
  const firstMenuItem = useRef<View>(null);
  const pendingAction = useRef<string | null>(null);
  const requestId = useRef(0);
  const summaryPopup = useRef<PopupSummaryConfig | null>(null);
  const [anchor, setAnchor] = useState<{ right: number; top: number } | null>(
    null,
  );
  const [loadingSummary, setLoadingSummary] = useState(false);
  const offerId = view.conversation.purchase_offer_id;
  const revision = view.context.offer_revision;
  const selection = view.conversation.selected_fulfillment_catalog_id;
  const price = offerId ? formatConversationOfferTotal(view.context) : null;
  const sourceKey = [
    view.conversation.id,
    profileId,
    activeProfile?.profile.id,
    offerId,
    revision,
    selection,
    view.conversation.status_code,
    JSON.stringify(buttons),
  ].join(":");

  useEffect(
    () =>
      subscribePopup(({ config }) => {
        if (config !== summaryPopup.current) {
          summaryPopup.current = null;
          if (config) {
            requestId.current += 1;
            setLoadingSummary(false);
          }
        }
      }),
    [],
  );

  const resetOverlays = useCallback(() => {
    requestId.current += 1;
    pendingAction.current = null;
    setAnchor(null);
    setLoadingSummary(false);
    if (summaryPopup.current) closePopup();
  }, []);
  useEffect(resetOverlays, [sourceKey, resetOverlays]);
  useFocusEffect(useCallback(() => resetOverlays, [resetOverlays]));

  useEffect(() => {
    setAnchor(null);
  }, [width, disabled]);

  const restoreMenuFocus = () => {
    const handle = findNodeHandle(trigger.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  };
  const finishMenu = () => {
    const id = pendingAction.current;
    pendingAction.current = null;
    if (id) onPress(id);
    else restoreMenuFocus();
  };
  const closeMenu = (id?: string) => {
    pendingAction.current = id ?? null;
    setAnchor(null);
    if (Platform.OS !== "ios") requestAnimationFrame(finishMenu);
  };
  const openMenu = () => {
    Keyboard.dismiss();
    trigger.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      setAnchor({
        right: Math.max(t.spacing.md, width - x - measuredWidth),
        top: y + measuredHeight + t.spacing.sm,
      });
    });
  };
  const openSummary = async () => {
    if (loadingSummary || disabled || !offerId) return;
    Keyboard.dismiss();
    const id = ++requestId.current;
    setLoadingSummary(true);
    try {
      const result = await getCurrentConversationOfferSummary(
        view.conversation.id,
      );
      if (id !== requestId.current) return;
      if (!result.ok) {
        showError("No se pudo cargar el resumen", result.error.message);
        return;
      }
      if (
        result.profileId !== profileId ||
        result.data.conversation.purchase_offer_id !== offerId
      )
        return;
      if (
        result.data.context.offer_revision !== revision ||
        result.data.conversation.selected_fulfillment_catalog_id !== selection
      ) {
        showInfo(
          "La oferta cambió",
          "Actualiza la conversación y vuelve a abrir el resumen.",
        );
        return;
      }
      const config: PopupSummaryConfig = {
        type: "summary",
        title: "Resumen de la oferta",
        ...buildConversationOfferSummary(result.data.context),
        images: result.images,
        androidBackActionId: "offer-summary-close",
        actions: [
          {
            id: "offer-summary-close",
            label: "Cerrar",
            backgroundColorKey: "backgroudWhite",
            textColorKey: "textDark",
          },
        ],
      };
      summaryPopup.current = config;
      openPopup(config);
    } catch {
      if (id === requestId.current)
        showError("No se pudo cargar el resumen", "Intenta de nuevo.");
    } finally {
      if (id === requestId.current) setLoadingSummary(false);
    }
  };

  if (!offerId && buttons.length === 0) return null;

  return (
    <View
      style={{
        paddingHorizontal: t.spacing.md,
        paddingTop: t.spacing.sm,
        paddingBottom: t.spacing.sm,
      }}
    >
      <ConversationContextControls
        price={price}
        primary={offerId ? {
          label: "Resumen",
          accessibilityLabel: "Resumen de la oferta",
          onPress: openSummary,
          disabled,
          busy: loadingSummary,
        } : undefined}
        secondary={buttons.length > 0 ? {
          label: "Acciones",
          accessibilityLabel: "Acciones de la conversación",
          onPress: openMenu,
          disabled,
          expanded: anchor !== null,
          icon: anchor ? "chevron-up" : "chevron-down",
          triggerRef: trigger,
        } : undefined}
      />
      <Modal
        transparent
        visible={anchor !== null}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => closeMenu()}
        onDismiss={finishMenu}
        onShow={() => {
          const handle = findNodeHandle(firstMenuItem.current);
          if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
        }}
      >
        <View style={{ flex: 1 }} accessibilityViewIsModal>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => closeMenu()}
            accessible={false}
          />
          {anchor ? (
            <GlassSurface
              variant="sheet"
              style={{
                position: "absolute",
                top: anchor.top,
                right: anchor.right,
                width: Math.min(width - t.spacing.md * 2, 280),
              }}
            >
              <ScrollView
                style={{
                  maxHeight: Math.max(
                    48,
                    height - anchor.top - insets.bottom - t.spacing.md,
                  ),
                }}
                keyboardShouldPersistTaps="handled"
              >
                {buttons.map((button, index) => (
                  <Pressable
                    key={button.id}
                    ref={index === 0 ? firstMenuItem : undefined}
                    accessibilityRole="button"
                    accessibilityLabel={button.label}
                    disabled={disabled}
                    onPress={() => closeMenu(button.id)}
                    style={({ pressed }) => ({
                      minHeight: 56,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: t.spacing.sm,
                      padding: t.spacing.md,
                      borderTopWidth: index ? StyleSheet.hairlineWidth : 0,
                      borderTopColor: t.colors.border,
                      opacity: pressed || disabled ? 0.6 : 1,
                    })}
                  >
                    <Icon
                      name={button.icon}
                      size={22}
                      color={
                        button.tone === "danger"
                          ? t.colors.error
                          : t.colors.textDark
                      }
                    />
                    <Text
                      variant="body"
                      style={{
                        flex: 1,
                        color:
                          button.tone === "danger"
                            ? t.colors.error
                            : t.colors.textDark,
                      }}
                    >
                      {button.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </GlassSurface>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
