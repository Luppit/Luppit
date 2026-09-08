import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  View,
  type ViewProps,
} from "react-native";
import Animated, {
  KeyboardState,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getChatKeyboardPadding } from "./keyboard";

type Props = ViewProps & { androidEnabled?: boolean };

function AndroidChatKeyboardView({ children, style, onLayout, ...props }: ViewProps) {
  const insets = useSafeAreaInsets();
  const viewRef = useRef<View>(null);
  const screenHeight = useSharedValue(Dimensions.get("screen").height);
  const viewportBottom = useSharedValue(Dimensions.get("screen").height);
  // The native stream starts on the next transition if a keyboard is already open.
  const initialKeyboard = Keyboard.metrics();
  const initialKeyboardHeight = useSharedValue(
    initialKeyboard && initialKeyboard.height > 0
      ? Math.max(0, Dimensions.get("screen").height - initialKeyboard.screenY)
      : 0,
  );
  // This owns Android IME layout while mounted. Keep the app's edge-to-edge
  // system bars and include the entire IME, including its navigation area.
  const keyboard = useAnimatedKeyboard();

  const measureViewport = useCallback(() => {
    screenHeight.value = Dimensions.get("screen").height;
    viewRef.current?.measureInWindow((_x, y, _width, height) => {
      // Android window coordinates exclude the top system inset.
      viewportBottom.value = y + height + insets.top;
    });
  }, [insets.top, screenHeight, viewportBottom]);

  useEffect(measureViewport, [measureViewport]);

  const keyboardStyle = useAnimatedStyle(() => ({
    paddingBottom: getChatKeyboardPadding(
      viewportBottom.value,
      screenHeight.value,
      keyboard.state.value === KeyboardState.UNKNOWN
        ? initialKeyboardHeight.value
        : keyboard.height.value,
    ),
  }));

  return (
    <Animated.View
      {...props}
      ref={viewRef}
      collapsable={false}
      style={[style, keyboardStyle]}
      onLayout={(event) => {
        measureViewport();
        onLayout?.(event);
      }}
    >
      {children}
    </Animated.View>
  );
}

export function useAndroidChatKeyboardVisible() {
  const [visible, setVisible] = useState(
    () => Platform.OS === "android" && Keyboard.isVisible(),
  );

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", () => setVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

export default function ChatKeyboardAvoidingView({
  androidEnabled = true,
  ...props
}: Props) {
  if (Platform.OS === "android" && androidEnabled) {
    return <AndroidChatKeyboardView {...props} />;
  }

  return (
    <KeyboardAvoidingView
      {...props}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    />
  );
}
