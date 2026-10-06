import { hasOpenPopup } from "@/src/services/popup.service";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Keyboard } from "react-native";

export default function useConversationCardExpansion(
  identity: string,
  keyboardVisible: boolean,
  isExecutingAction: boolean,
) {
  const [expanded, setExpanded] = useState(!keyboardVisible);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(true);
  const keyboardVisibleRef = useRef(keyboardVisible);
  keyboardVisibleRef.current = keyboardVisible;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (active) setScreenReaderEnabled(enabled);
    }).catch(() => {});
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    }).catch(() => {});
    const reader = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReaderEnabled);
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      active = false;
      reader.remove();
      motion.remove();
    };
  }, []);

  const reset = useCallback(() => setExpanded(!keyboardVisibleRef.current), []);
  useEffect(reset, [identity, reset]);

  const collapse = useCallback(() => {
    if (screenReaderEnabled || isExecutingAction || hasOpenPopup()) return;
    setExpanded(false);
  }, [isExecutingAction, screenReaderEnabled]);

  useEffect(() => {
    if (keyboardVisible && !isExecutingAction && !hasOpenPopup()) setExpanded(false);
  }, [isExecutingAction, keyboardVisible]);

  const toggle = useCallback(() => {
    if (isExecutingAction || hasOpenPopup()) return;
    if (!expanded) Keyboard.dismiss();
    setExpanded(!expanded);
    AccessibilityInfo.announceForAccessibility(
      expanded ? "Información de la compra recogida" : "Información de la compra expandida",
    );
  }, [expanded, isExecutingAction]);

  return { expanded, collapse, toggle, reset, keyboardVisible, reduceMotion: reduceMotion || screenReaderEnabled };
}
