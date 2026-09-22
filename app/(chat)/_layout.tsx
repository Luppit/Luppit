import { useNavigation, usePreventRemove, type NavigationAction } from "@react-navigation/native";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { hasOpenPopup, openPopup } from "@/src/services/popup.service";
import { useAndroidLeaveGuard } from "@/src/utils/useAndroidLeaveGuard";
import { useAndroidBackAction } from "@/src/utils/useAndroidBackAction";
import ChatTopBar from "./chat-top-bar";
import {
  ChatSessionProvider,
  useChatSession,
} from "./chat-session.context";
import InputChat from "@/src/components/inputChat/inputChat";
import ChatKeyboardAvoidingView from "@/src/components/inputChat/ChatKeyboardAvoidingView";
import { Roles } from "@/src/services/role.service";
import {
  clearToastBottomInset,
  setToastBottomInset,
} from "@/src/services/toast.service";
import { getCurrentUserRole } from "@/src/services/user.role.service";
import { useTheme } from "@/src/themes";
import { Redirect, Slot, router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  LayoutChangeEvent,
  Platform,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOAST_INSET_SOURCE = "buyer-chat-composer";

function ChatLayoutContent() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const {
    title,
    sendMessage,
    messages,
    uiState,
    showComposer,
    canCompose,
    isSendingMessage,
    isExecutingControl,
    isRestoring,
    status,
    discardDraft,
    draftResetKey,
    draftId,
    stopAssistant,
  } = useChatSession();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [hasComposerDraft, setHasComposerDraft] = useState(false);
  const navigation = useNavigation();
  const [exitAction, setExitAction] = useState<NavigationAction | null>(null);
  const handledExitRef = useRef<NavigationAction | null>(null);
  useAndroidLeaveGuard(
    !draftId && uiState !== "published" && (hasComposerDraft || messages.length > 0),
    !draftId && isExecutingControl
  );
  useEffect(() => {
    if (!exitAction || handledExitRef.current === exitAction) return;
    handledExitRef.current = exitAction;
    navigation.dispatch(exitAction);
  }, [exitAction, navigation]);
  usePreventRemove(Boolean(draftId) && status !== "published" && status !== "cancelled" && !exitAction, ({ data }) => {
    if (isExecutingControl || hasOpenPopup()) return;
    Keyboard.dismiss();
    openPopup({
      type: "summary", title: "¿Salir de la solicitud?",
      description: hasComposerDraft
        ? "Puedes continuar después con el borrador guardado. El texto o las fotos que todavía no hayas enviado se perderán."
        : "Puedes salir y continuar después, o descartar este borrador.",
      dismissOnBackdropPress: false,
      dismissOnAndroidBack: true,
      actions: [
        { id: "exit-request", label: "Salir", backgroundColorKey: "backgroudWhite", textColorKey: "textDark", iconColorKey: "textDark", onPress: () => setExitAction(data.action) },
        { id: "discard-request-draft", label: "Descartar", backgroundColorKey: "error", textColorKey: "backgroudWhite", iconColorKey: "backgroudWhite", disabled: isSendingMessage || isRestoring, showPendingState: true,
          onPress: async () => {
            if (!await discardDraft()) return false;
            setHasComposerDraft(false);
            return true;
          },
        },
      ],
    });
  });
  const closeChat = useCallback(() => {
    Keyboard.dismiss();
    router.dismissTo("/(tabs)");
  }, []);
  useAndroidBackAction(closeChat);

  const handleComposerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setToastBottomInset(
        TOAST_INSET_SOURCE,
        event.nativeEvent.layout.height + t.spacing.sm
      );
    },
    [t.spacing.sm]
  );

  useEffect(() => {
    if (!showComposer) {
      clearToastBottomInset(TOAST_INSET_SOURCE);
    }

    return () => clearToastBottomInset(TOAST_INSET_SOURCE);
  }, [showComposer]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <ChatKeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.background }}
    >
      <View style={{ flex: 1 }}>
        <ChatTopBar
          title={title}
          onClose={closeChat}
          topInset={insets.top}
          isSurfaceVisible={Boolean(title?.trim())}
        />

        <View
          style={{ flex: 1, paddingHorizontal: t.spacing.md }}
          onTouchStart={() => Keyboard.dismiss()}
        >
          <Slot />
        </View>

        {showComposer ? (
          <View
            onLayout={handleComposerLayout}
            style={{
              paddingHorizontal: t.spacing.md,
              paddingTop: t.spacing.sm,
              paddingBottom: isKeyboardVisible
                ? t.spacing.md
                : Math.max(insets.bottom, t.spacing.sm),
            }}
          >
            <InputChat
              key={draftResetKey}
              onDraftChange={setHasComposerDraft}
              clearOnSendStart
              sendOnReturn={false}
              autoFocus={!isRestoring && canCompose && messages.length === 0}
              disabled={!canCompose}
              busy={isSendingMessage}
              onStop={stopAssistant}
              placeholder={
                uiState === "review" ? "Escribe un cambio" : "Escribe un mensaje"
              }
              maxImages={3}
              onSend={({ text, images }) => {
                void sendMessage({ text, images });
              }}
            />
          </View>
        ) : null}
      </View>
    </ChatKeyboardAvoidingView>
  );
}

export default function ChatLayout() {
  const { activeProfile } = useActiveProfile();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Roles | null>(null);

  useEffect(() => {
    let active = true;

    const resolveRole = async () => {
      setReady(false);
      const result = await getCurrentUserRole();
      if (!active) return;

      if (result.ok) {
        setRole(result.data);
      } else {
        setRole(null);
      }
      setReady(true);
    };

    void resolveRole();

    return () => {
      active = false;
    };
  }, [activeProfile?.profile.id]);

  if (!ready) return null;

  if (role !== Roles.BUYER) return <Redirect href="/(tabs)" />;

  return (
    <ChatSessionProvider key={activeProfile?.profile.id}>
      <ChatLayoutContent />
    </ChatSessionProvider>
  );
}
