import ChatTopBar from "@/src/components/chatLayout/ChatTopBar";
import {
  ChatSessionProvider,
  useChatSession,
} from "@/src/components/chatLayout/ChatSessionContext";
import InputChat from "@/src/components/inputChat/inputChat";
import { Roles } from "@/src/services/role.service";
import { getCurrentUserRole } from "@/src/services/user.role.service";
import { useTheme } from "@/src/themes";
import { Redirect, Slot, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function ChatLayoutContent() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { title, sendMessage, messages } = useChatSession();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={{ flex: 1 }}>
        <ChatTopBar
          title={title}
          onClose={() => {
            Keyboard.dismiss();
            router.back();
          }}
          topInset={insets.top}
          isSurfaceVisible={Boolean(title?.trim())}
        />

        <View
          style={{ flex: 1, paddingHorizontal: t.spacing.md }}
          onTouchStart={() => Keyboard.dismiss()}
        >
          <Slot />
        </View>

        <View
          style={{
            paddingHorizontal: t.spacing.md,
            paddingTop: t.spacing.sm,
            paddingBottom: isKeyboardVisible
              ? t.spacing.md
              : Math.max(insets.bottom, t.spacing.sm),
          }}
        >
          <InputChat
            autoFocus={messages.length === 0}
            onSend={({ text }) => {
              sendMessage(text);
            }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function ChatLayout() {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Roles | null>(null);

  useEffect(() => {
    let active = true;

    const resolveRole = async () => {
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
  }, []);

  if (!ready) return null;

  if (role !== Roles.BUYER) return <Redirect href="/(tabs)" />;

  return (
    <ChatSessionProvider>
      <ChatLayoutContent />
    </ChatSessionProvider>
  );
}
