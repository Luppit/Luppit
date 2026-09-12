import ConversationActionButtons from "@/src/components/conversation/ConversationActionButtons";
import {
  toTopButtonConfig,
  useConversationActions,
} from "@/src/components/conversation/useConversationActions";
import Button from "@/src/components/button/Button";
import { Text } from "@/src/components/Text";
import {
  ConversationView,
  getCurrentUserConversationView,
} from "@/src/services/conversation.service";
import { useTheme } from "@/src/themes";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";

type Props = {
  conversationId: string;
  purchaseRequestId: string;
  purchaseOfferId: string;
  onRefresh: () => void;
};

export default function SelectedOfferPickupAction({
  conversationId,
  purchaseRequestId,
  purchaseOfferId,
  onRefresh,
}: Props) {
  const t = useTheme();
  const [view, setView] = useState<ConversationView | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const activeRef = useRef(false);
  const loadingRef = useRef(false);
  const loadVersion = useRef(0);

  const loadView = useCallback(async () => {
    const version = ++loadVersion.current;
    loadingRef.current = true;
    setIsLoading(true);
    setLoadFailed(false);
    setView(null);
    setProfileId(null);
    try {
      const result = await getCurrentUserConversationView(conversationId);
      if (!activeRef.current || version !== loadVersion.current) return null;
      if (!result.ok ||
        result.data.conversation.id !== conversationId ||
        result.data.conversation.purchase_request_id !== purchaseRequestId ||
        result.data.conversation.purchase_offer_id !== purchaseOfferId ||
        result.data.role_code !== "BUYER") {
        setLoadFailed(true);
        return null;
      }
      setView(result.data);
      setProfileId(result.profileId);
      return result;
    } catch {
      if (activeRef.current && version === loadVersion.current) setLoadFailed(true);
      return null;
    } finally {
      if (activeRef.current && version === loadVersion.current) {
        loadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [conversationId, purchaseOfferId, purchaseRequestId]);

  useFocusEffect(useCallback(() => {
    activeRef.current = true;
    void loadView();
    return () => {
      activeRef.current = false;
      ++loadVersion.current;
    };
  }, [loadView]));

  const refreshConversation = useCallback(async () => {
    await loadView();
    if (activeRef.current) onRefresh();
  }, [loadView, onRefresh]);
  const { isExecutingAction, executingActionId, handleActionPress } =
    useConversationActions({
      conversationId,
      profileId,
      conversationView: view,
      refreshConversation,
    });
  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener("change", (state) => {
      const returnedToForeground = state === "active" && previousState !== "active";
      previousState = state;
      if (returnedToForeground && activeRef.current && !loadingRef.current && !isExecutingAction) {
        void refreshConversation();
      }
    });
    return () => subscription.remove();
  }, [isExecutingAction, refreshConversation]);
  // Select the existing TOP action; its presence in actions[] owns eligibility.
  const action = view?.actions.find((item) =>
    item.code === "BUYER_REQUEST_PICKUP_CODE" && item.ui_slot?.toUpperCase() === "TOP"
  );

  if (isLoading && !isExecutingAction) {
    return <Text variant="small" color="textMedium">Cargando acciones…</Text>;
  }
  if (loadFailed) {
    return (
      <View style={{ gap: t.spacing.sm }}>
        <Text variant="small" color="textMedium" accessibilityRole="alert">
          No pudimos cargar las acciones de esta compra.
        </Text>
        <Button title="Reintentar" onPress={() => void loadView()} />
      </View>
    );
  }
  if (!action) return null;

  return (
    <ConversationActionButtons
      buttons={[toTopButtonConfig(action)]}
      disabled={isLoading || isExecutingAction}
      loadingButtonId={executingActionId}
      onPress={() => {
        if (loadingRef.current || isExecutingAction) return;
        handleActionPress(action);
      }}
    />
  );
}
