import {
  normalizeOptionalIcon,
  normalizeStyleFlags,
  toTopButtonConfig,
  useConversationActions,
} from "@/src/components/conversation/useConversationActions";
import { useAndroidLeaveGuard } from "@/src/utils/useAndroidLeaveGuard";
import { useAndroidBackAction } from "@/src/utils/useAndroidBackAction";
import { useFocusEffect } from "@react-navigation/native";
import ConversationHeaderControls from "@/src/components/conversation/ConversationHeaderControls";
import Button from "@/src/components/button/Button";
import GlassSurface from "@/src/components/glass/GlassSurface";
import { Icon } from "@/src/components/Icon";
import InputChat from "@/src/components/inputChat/inputChat";
import ChatKeyboardAvoidingView, {
  useAndroidChatKeyboardVisible,
} from "@/src/components/inputChat/ChatKeyboardAvoidingView";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import { getSession } from "@/src/lib/supabase";
import { supabase } from "@/src/lib/supabase/client";
import type { AppError } from "@/src/lib/supabase/errors";
import {
  openPopup,
  PopupOption,
} from "@/src/services/popup.service";
import {
  ConversationMessage,
  createConversationMessageGroupId,
  createConversationMessages,
} from "@/src/services/conversation.message.service";
import {
  ConversationView,
  ConversationViewAction,
  getCurrentProfileConversationById,
  getCurrentUserConversationView,
} from "@/src/services/conversation.service";
import {
  clearToastBottomInset,
  setToastBottomInset,
} from "@/src/services/toast.service";
import { useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { Redirect, Slot, router, useGlobalSearchParams } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  LayoutChangeEvent,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOAST_INSET_SOURCE = "conversation-composer";

function isUnavailableConversationError(error: AppError | null) {
  return error?.type === "auth" || error?.type === "not_found";
}

type ConversationLayoutContextValue = {
  conversationId: string;
  profileId: string;
  conversationView: ConversationView;
  showComposer: boolean;
  refreshConversation: () => Promise<void>;
  messageRefreshTick: number;
  optimisticMessages: ConversationMessage[];
  clearOptimisticMessages: (messageIds: string[]) => void;
  contentTopInset: number;
  contentBottomInset: number;
};

const ConversationLayoutContext = createContext<ConversationLayoutContextValue | null>(
  null
);

export function useConversationLayout() {
  const value = useContext(ConversationLayoutContext);
  if (!value) {
    throw new Error("useConversationLayout must be used inside /(conversation) layout");
  }
  return value;
}

function parseStringParam(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

function toMenuOptionConfig(action: ConversationViewAction): PopupOption {
  const { isDanger, isPrimary } = normalizeStyleFlags(action.style_code);

  return {
    id: action.id,
    label: action.label || action.code || "",
    icon: normalizeOptionalIcon(action.icon),
    textColorKey: isDanger ? "error" : isPrimary ? "primary" : "textDark",
    iconColorKey: isDanger ? "error" : isPrimary ? "primary" : "textDark",
  };
}

function createOptimisticMessageId(index: number) {
  return `optimistic-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
}

type ConversationRealtimeRefreshTarget = "view" | "messages";

type ConversationRealtimePayload = {
  conversation_id?: string;
  reason?: string;
  refresh?: unknown;
};

const realtimeRefreshDelayMs = 200;

function getRealtimeRefreshTargets(
  payload: ConversationRealtimePayload
): ConversationRealtimeRefreshTarget[] {
  if (!Array.isArray(payload.refresh)) return ["view", "messages"];

  const targets = payload.refresh.filter(
    (target): target is ConversationRealtimeRefreshTarget =>
      target === "view" || target === "messages"
  );

  return targets.length > 0 ? targets : ["view", "messages"];
}

export default function ConversationLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const isAndroidKeyboardVisible = useAndroidChatKeyboardVisible();
  const params = useGlobalSearchParams<{
    conversationId?: string | string[];
    title?: string | string[];
  }>();
  const [conversationView, setConversationView] = useState<ConversationView | null>(
    null
  );
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<AppError | null>(null);
  const [messageRefreshTick, setMessageRefreshTick] = useState(0);
  const [composerOverlayHeight, setComposerOverlayHeight] = useState(0);
  const [headerControlsHeight, setHeaderControlsHeight] = useState(0);
  const [purchaseRequestTitle, setPurchaseRequestTitle] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<ConversationMessage[]>(
    []
  );
  const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const realtimeRefreshTargetsRef = useRef<Set<ConversationRealtimeRefreshTarget>>(
    new Set()
  );

  const conversationId = useMemo(
    () => parseStringParam(params.conversationId),
    [params.conversationId]
  );
  const routeTitle = useMemo(() => parseStringParam(params.title), [params.title]);
  const showComposer = conversationView?.permissions.can_send_messages ?? false;
  const [hasComposerDraft, setHasComposerDraft] = useState(false);
  const [pendingMessageCount, setPendingMessageCount] = useState(0);
  const closeConversation = useCallback(() => {
    if (!router.canGoBack() &&
      (Platform.OS === "android" || isUnavailableConversationError(loadError))) {
      router.replace("/(tabs)/chats");
      return;
    }
    router.back();
  }, [loadError]);
  useAndroidBackAction(closeConversation, {
    enabled: Boolean(conversationId) && !isLoading &&
      (Boolean(conversationView && profileId) || isUnavailableConversationError(loadError)),
  });

  useEffect(() => {
    if (!showComposer) {
      clearToastBottomInset(TOAST_INSET_SOURCE);
    }

    return () => clearToastBottomInset(TOAST_INSET_SOURCE);
  }, [showComposer]);

  useEffect(() => {
    if (!conversationId) {
      setPurchaseRequestTitle(null);
      return;
    }

    let active = true;

    const loadPurchaseRequestTitle = async () => {
      const result = await getCurrentProfileConversationById(conversationId);
      if (!active) return;

      if (!result.ok) {
        setPurchaseRequestTitle(null);
        return;
      }

      setPurchaseRequestTitle(result.data.request_title?.trim() || null);
    };

    void loadPurchaseRequestTitle();

    return () => {
      active = false;
    };
  }, [conversationId]);

  useEffect(() => {
    setOptimisticMessages([]);
  }, [conversationId]);

  const clearOptimisticMessages = useCallback((messageIds: string[]) => {
    if (messageIds.length === 0) return;

    const idSet = new Set(messageIds);
    setOptimisticMessages((current) =>
      current.filter((message) => !idSet.has(message.id))
    );
  }, []);

  const buildOptimisticMessages = useCallback(
    (text: string, images: { uri: string }[], messageGroupId: string) => {
      if (!conversationId || !profileId) return [];

      const now = Date.now();
      const nextMessages: ConversationMessage[] = [];
      const trimmed = text.trim();

      if (trimmed) {
        nextMessages.push({
          id: createOptimisticMessageId(nextMessages.length),
          conversation_id: conversationId,
          sender_profile_id: profileId,
          text: trimmed,
          message_kind: "TEXT",
          image_path: null,
          image_url: null,
          visible_to_role_id: null,
          buyer_open_state: null,
          buyer_opened_at: null,
          seller_open_state: null,
          seller_opened_at: null,
          message_group_id: messageGroupId,
          message_group_index: nextMessages.length,
          created_at: new Date(now).toISOString(),
        });
      }

      images.forEach((image) => {
        nextMessages.push({
          id: createOptimisticMessageId(nextMessages.length),
          conversation_id: conversationId,
          sender_profile_id: profileId,
          text: null,
          message_kind: "IMAGE",
          image_path: null,
          image_url: image.uri,
          visible_to_role_id: null,
          buyer_open_state: null,
          buyer_opened_at: null,
          seller_open_state: null,
          seller_opened_at: null,
          message_group_id: messageGroupId,
          message_group_index: nextMessages.length,
          created_at: new Date(now + nextMessages.length).toISOString(),
        });
      });

      return nextMessages;
    },
    [conversationId, profileId]
  );

  const refreshConversation = useCallback(async () => {
    if (!conversationId) return;

    const result = await getCurrentUserConversationView(conversationId);
    if (!result.ok) {
      setLoadError(result.error);
      setConversationView(null);
      setProfileId(null);
      setIsLoading(false);
      return;
    }

    setLoadError(null);
    setConversationView(result.data);
    setProfileId(result.profileId);
    setIsLoading(false);
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void refreshConversation();
    }, [refreshConversation])
  );

  useEffect(() => {
    if (!conversationId) return;

    let isActive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const clearPendingRefresh = () => {
      if (!realtimeRefreshTimeoutRef.current) return;
      clearTimeout(realtimeRefreshTimeoutRef.current);
      realtimeRefreshTimeoutRef.current = null;
      realtimeRefreshTargetsRef.current.clear();
    };

    const scheduleRefresh = (payload: ConversationRealtimePayload) => {
      if (payload.conversation_id && payload.conversation_id !== conversationId) {
        return;
      }

      const targets = getRealtimeRefreshTargets(payload);
      targets.forEach((target) => realtimeRefreshTargetsRef.current.add(target));

      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
      }

      realtimeRefreshTimeoutRef.current = setTimeout(() => {
        realtimeRefreshTimeoutRef.current = null;
        if (!isActive) return;

        const pendingTargets = Array.from(realtimeRefreshTargetsRef.current);
        realtimeRefreshTargetsRef.current.clear();

        if (pendingTargets.includes("view")) {
          void refreshConversation();
        }

        if (pendingTargets.includes("messages")) {
          setMessageRefreshTick((prev) => prev + 1);
        }
      }, realtimeRefreshDelayMs);
    };

    const subscribe = async () => {
      const session = await getSession();
      if (!isActive) return;

      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (!isActive) return;

      const nextChannel = supabase.channel(`conversation:${conversationId}`, {
        config: { private: true },
      });

      channel = nextChannel;
      nextChannel
        .on(
          "broadcast",
          { event: "conversation_changed" },
          ({ payload }: { payload: ConversationRealtimePayload }) => {
            scheduleRefresh(payload ?? {});
          }
        )
        .subscribe();
    };

    void subscribe();

    return () => {
      isActive = false;
      clearPendingRefresh();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [conversationId, refreshConversation]);

  const { isExecutingAction, handleActionPress } =
    useConversationActions({
      conversationId,
      profileId,
      conversationView,
      refreshConversation,
      onMessagesRefresh: () => setMessageRefreshTick((prev) => prev + 1),
      onConversationPurged: async () => {
        await allowNavigation(() => router.replace("/(tabs)/chats"));
      },
    });
  const allowNavigation = useAndroidLeaveGuard(
    showComposer && hasComposerDraft, isExecutingAction || pendingMessageCount > 0
  );

  const openConversationMenu = useCallback(
    (actions: ConversationViewAction[]) => {
      if (actions.length === 0) return;

      openPopup({
        options: actions.map((action) => ({
          ...toMenuOptionConfig(action),
          onPress: () => handleActionPress(action),
        })),
      });
    },
    [handleActionPress]
  );

  const handleComposerOverlayLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setComposerOverlayHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight
    );
    setToastBottomInset(TOAST_INSET_SOURCE, nextHeight + t.spacing.sm);
  }, [t.spacing.sm]);

  const handleHeaderControlsLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setHeaderControlsHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight
    );
  }, []);

  if (!conversationId) return <Redirect href="/(tabs)" />;

  if (isLoading) {
    return <LoadingState label="Cargando conversación..." />;
  }

  if (!conversationView || !profileId) {
    const isUnavailable = isUnavailableConversationError(loadError);

    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: t.spacing.xl,
          gap: t.spacing.md,
          backgroundColor: t.colors.background,
        }}
      >
        <Text variant="body" align="center">
          {isUnavailable
            ? "Esta conversación no está disponible."
            : loadError?.message ?? "No se pudo cargar la conversación."}
        </Text>
        <Button
          title={isUnavailable ? "Volver" : "Reintentar"}
          onPress={() => {
            if (isUnavailable) {
              closeConversation();
              return;
            }

            setIsLoading(true);
            void refreshConversation();
          }}
        />
      </View>
    );
  }

  const rawHeaderActions = conversationView.actions.filter(
    (action) => ["TOP", "AUX"].includes((action.ui_slot ?? "").toUpperCase())
  );
  const headerActions = rawHeaderActions.map(toTopButtonConfig);
  const headerActionsById = new Map(
    rawHeaderActions.map((action) => [action.id, action] as const)
  );
  const menuActions = conversationView.actions.filter(
    (action) => (action.ui_slot ?? "").toUpperCase() === "MENU"
  );
  const showHeaderControls = Boolean(conversationView.conversation.purchase_offer_id) ||
    headerActions.length > 0;
  const headerBarHeight = 56;
  const headerControlsFallbackHeight = t.spacing.sm * 2 + 48;
  const composerOverlayFallbackHeight =
    showComposer ? Math.max(insets.bottom, t.spacing.sm) + 88 : 0;
  const contentTopInset = showHeaderControls
    ? headerControlsHeight || headerControlsFallbackHeight
    : 0;
  const contentBottomInset = showComposer && Platform.OS !== "android"
    ? composerOverlayHeight || composerOverlayFallbackHeight
    : 0;
  const title = purchaseRequestTitle ?? routeTitle ?? "Conversación";

  const providerValue: ConversationLayoutContextValue = {
    conversationId,
    profileId,
    conversationView,
    showComposer,
    refreshConversation,
    messageRefreshTick,
    optimisticMessages,
    clearOptimisticMessages,
    contentTopInset,
    contentBottomInset,
  };

  return (
    <ConversationLayoutContext.Provider value={providerValue}>
      <ChatKeyboardAvoidingView
        style={{ flex: 1, backgroundColor: t.colors.background }}
      >
        <View style={{ flex: 1 }}>
          <GlassSurface
            variant="chrome"
            blur="chrome"
            style={{
              zIndex: 10,
              elevation: Platform.OS === "android" ? 4 : 10,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: t.glass.radius.chrome,
              borderBottomRightRadius: t.glass.radius.chrome,
            }}
            clipStyle={{
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: t.glass.radius.chrome,
              borderBottomRightRadius: t.glass.radius.chrome,
              overflow: "hidden",
            }}
            contentStyle={{
              paddingTop: insets.top + t.spacing.xs,
              paddingHorizontal: t.spacing.lg,
              paddingBottom: t.spacing.xs,
            }}
          >
            <View
              style={{
                minHeight: headerBarHeight,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: t.spacing.xs,
              }}
            >
              <Pressable
                onPress={closeConversation}
                accessibilityRole="button"
                accessibilityLabel="Volver"
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "flex-start",
                  justifyContent: "center",
                }}
              >
                <Icon name="arrow-left" size={28} />
              </Pressable>

              <Text
                variant="subtitle"
                align="center"
                maxLines={2}
                maxFontSizeMultiplier={2}
                accessibilityRole="header"
                style={{ flex: 1, paddingHorizontal: t.spacing.sm }}
              >
                {title}
              </Text>

              {menuActions.length > 0 ? (
                <Pressable
                  onPress={() => openConversationMenu(menuActions)}
                  disabled={isExecutingAction}
                  accessibilityRole="button"
                  accessibilityLabel="Más acciones"
                  accessibilityState={{
                    disabled: isExecutingAction,
                    busy: isExecutingAction,
                  }}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    alignItems: "flex-end",
                    justifyContent: "center",
                    opacity: isExecutingAction ? 0.6 : pressed ? 0.72 : 1,
                  })}
                >
                  <Icon name="ellipsis" size={28} />
                </Pressable>
              ) : (
                <View style={{ width: 44, height: 44 }} />
              )}
            </View>
          </GlassSurface>

          <View
            style={{
              flex: 1,
            }}
          >
            <View
              style={{ flex: 1, paddingHorizontal: t.spacing.md }}
              onTouchStart={() => Keyboard.dismiss()}
            >
              <Slot />
            </View>

            {showHeaderControls ? (
              <View
                pointerEvents="box-none"
                onLayout={handleHeaderControlsLayout}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 9,
                  backgroundColor: "transparent",
                }}
              >
                <ConversationHeaderControls
                  view={conversationView}
                  profileId={profileId}
                  buttons={headerActions}
                  disabled={isExecutingAction}
                  onPress={(id) => {
                    const action = headerActionsById.get(id);
                    if (!action) return;
                    handleActionPress(action);
                  }}
                />
              </View>
            ) : null}
          </View>

          {showComposer ? (
            <View
              pointerEvents="box-none"
              onLayout={handleComposerOverlayLayout}
              style={{
                position: Platform.OS === "android" ? "relative" : "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9,
                elevation: 9,
                backgroundColor: t.colors.background,
              }}
            >
              <View
                style={{
                  paddingHorizontal: t.spacing.md,
                  paddingTop: t.spacing.sm,
                  paddingBottom: isAndroidKeyboardVisible
                    ? t.spacing.sm
                    : Math.max(insets.bottom, t.spacing.sm),
                  backgroundColor: t.colors.background,
                }}
              >
                <InputChat
                  onDraftChange={setHasComposerDraft}
                  clearOnSendStart
                  placeholder="Escribe un mensaje"
                  onSend={({ text, images }) => {
                    const messageGroupId = createConversationMessageGroupId();
                    const outgoingMessages = buildOptimisticMessages(
                      text,
                      images,
                      messageGroupId
                    );
                    if (outgoingMessages.length === 0) return;

                    const outgoingMessageIds = outgoingMessages.map(
                      (message) => message.id
                    );
                    setOptimisticMessages((current) => [
                      ...current,
                      ...outgoingMessages,
                    ]);

                    setPendingMessageCount((current) => current + 1);
                    void (async () => {
                      try {
                        const created = await createConversationMessages({
                          conversationId,
                          text,
                          images,
                          messageGroupId,
                        });

                        if (!created.ok) {
                          clearOptimisticMessages(outgoingMessageIds);
                          showError(
                            "No se pudo enviar el mensaje",
                            created.error.message
                          );
                          return;
                        }

                        setOptimisticMessages((current) => [
                          ...current.filter(
                            (message) => !outgoingMessageIds.includes(message.id)
                          ),
                          ...created.data,
                        ]);
                        setMessageRefreshTick((prev) => prev + 1);
                      } catch {
                        clearOptimisticMessages(outgoingMessageIds);
                        showError(
                          "No se pudo enviar el mensaje",
                          "Ocurrió un error, intenta de nuevo."
                        );
                      } finally {
                        setPendingMessageCount((current) => Math.max(0, current - 1));
                      }
                    })();
                  }}
                />
              </View>
            </View>
          ) : null}
        </View>
      </ChatKeyboardAvoidingView>
    </ConversationLayoutContext.Provider>
  );
}
