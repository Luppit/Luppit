import ToastCard from "@/src/components/toast/ToastCard";
import { getUnconsumedKeyboardOverlap } from "@/src/components/toast/keyboard";
import {
  hideToast,
  subscribeToast,
  type ToastMessage,
  type ToastVariant,
} from "@/src/services/toast.service";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  type AppStateStatus,
  Easing,
  Keyboard,
  type KeyboardEvent,
  PanResponder,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/themes";

const ENTER_DURATION = 220;
const EXIT_DURATION = 160;
const REDUCED_MOTION_DURATION = 120;
const SCREEN_READER_MIN_DURATION = 10_000;

type PauseReason = "app" | "touch" | "action";

function getToastDuration(toast: ToastMessage, screenReaderEnabled: boolean) {
  let duration = toast.duration;

  if (duration == null) {
    if (toast.action) {
      duration = 8_000;
    } else if (toast.variant === "error") {
      duration = 6_000;
    } else if (toast.variant === "success" && !toast.description?.trim()) {
      duration = 2_800;
    } else {
      duration = 4_500;
    }
  }

  return screenReaderEnabled
    ? Math.max(duration, SCREEN_READER_MIN_DURATION)
    : duration;
}

function getAnnouncement(toast: ToastMessage) {
  const prefixes: Record<ToastVariant, string> = {
    success: "Éxito",
    error: "Error",
    info: "Información",
    warning: "Advertencia",
  };
  const parts = [prefixes[toast.variant], toast.title, toast.description]
    .map((part) => part?.trim())
    .filter(Boolean);

  if (toast.action?.label.trim()) {
    parts.push(`Acción disponible: ${toast.action.label.trim()}`);
  }

  return parts.join(". ");
}

export default function GlobalToastHost() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const [renderedToast, setRenderedToast] = useState<ToastMessage | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState<boolean | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [bottomInset, setBottomInset] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [androidKeyboardOverlap, setAndroidKeyboardOverlap] = useState(0);

  const hostRef = useRef<View | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const scale = useRef(new Animated.Value(0.98)).current;
  const renderedToastRef = useRef<ToastMessage | null>(null);
  const desiredToastRef = useRef<ToastMessage | null>(null);
  const isExitingRef = useRef(false);
  const actionPendingRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pauseReasonsRef = useRef(new Set<PauseReason>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerStartedAtRef = useRef(0);
  const remainingDurationRef = useRef(0);
  const durationToastIdRef = useRef<string | null>(null);
  const dismissRef = useRef<(id?: string) => void>(() => undefined);
  const androidKeyboardTopRef = useRef<number | null>(null);
  const androidMeasureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const measureAndroidKeyboardOverlap = useCallback(() => {
    if (Platform.OS !== "android") return;

    const keyboardTop = androidKeyboardTopRef.current;
    if (keyboardTop == null) {
      setAndroidKeyboardOverlap(0);
      return;
    }

    hostRef.current?.measureInWindow((_x, y, _width, height) => {
      setAndroidKeyboardOverlap(
        getUnconsumedKeyboardOverlap(y + height, keyboardTop)
      );
    });
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pauseTimer = useCallback(
    (reason: PauseReason) => {
      if (pauseReasonsRef.current.has(reason)) return;

      pauseReasonsRef.current.add(reason);
      if (timerRef.current) {
        const elapsed = Date.now() - timerStartedAtRef.current;
        remainingDurationRef.current = Math.max(
          0,
          remainingDurationRef.current - elapsed
        );
      }
      clearTimer();
    },
    [clearTimer]
  );

  const scheduleTimer = useCallback(() => {
    clearTimer();
    const toast = renderedToastRef.current;
    if (
      !toast ||
      screenReaderEnabled == null ||
      pauseReasonsRef.current.size > 0 ||
      appStateRef.current !== "active" ||
      isExitingRef.current
    ) {
      return;
    }

    if (remainingDurationRef.current <= 0) {
      dismissRef.current(toast.id);
      return;
    }

    timerStartedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      dismissRef.current(toast.id);
    }, remainingDurationRef.current);
  }, [clearTimer, screenReaderEnabled]);

  const resumeTimer = useCallback(
    (reason: PauseReason) => {
      pauseReasonsRef.current.delete(reason);
      scheduleTimer();
    },
    [scheduleTimer]
  );

  const animateIn = useCallback(() => {
    opacity.stopAnimation();
    translateY.stopAnimation();
    scale.stopAnimation();

    opacity.setValue(0);
    translateY.setValue(reduceMotion ? 0 : 12);
    scale.setValue(reduceMotion ? 1 : 0.98);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: reduceMotion ? REDUCED_MOTION_DURATION : ENTER_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: reduceMotion ? 0 : ENTER_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: reduceMotion ? 0 : ENTER_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, reduceMotion, scale, translateY]);

  const displayToast = useCallback(
    (toast: ToastMessage | null) => {
      renderedToastRef.current = toast;
      durationToastIdRef.current = null;
      pauseReasonsRef.current.clear();
      actionPendingRef.current = false;
      setActionPending(false);
      setRenderedToast(toast);

      if (toast) {
        requestAnimationFrame(animateIn);
      }
    },
    [animateIn]
  );

  const animateOut = useCallback(
    (onComplete: () => void) => {
      if (isExitingRef.current) return;

      isExitingRef.current = true;
      clearTimer();
      opacity.stopAnimation();
      translateY.stopAnimation();
      scale.stopAnimation();

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: reduceMotion ? REDUCED_MOTION_DURATION : EXIT_DURATION,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: reduceMotion ? 0 : 8,
          duration: reduceMotion ? 0 : EXIT_DURATION,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: reduceMotion ? 0 : EXIT_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isExitingRef.current = false;
        onComplete();
      });
    },
    [clearTimer, opacity, reduceMotion, scale, translateY]
  );

  const requestDismiss = useCallback(
    (id?: string) => {
      const toast = renderedToastRef.current;
      if (!toast || (id && toast.id !== id) || isExitingRef.current) return;

      animateOut(() => {
        renderedToastRef.current = null;
        setRenderedToast(null);
        hideToast(toast.id);

        if (!renderedToastRef.current && desiredToastRef.current?.id !== toast.id) {
          displayToast(desiredToastRef.current);
        }
      });
    },
    [animateOut, displayToast]
  );
  dismissRef.current = requestDismiss;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          renderedToastRef.current?.dismissible !== false &&
          gesture.dy > 4 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          pauseTimer("touch");
          translateY.stopAnimation();
          opacity.stopAnimation();
        },
        onPanResponderMove: (_event, gesture) => {
          const nextY = Math.max(gesture.dy, 0);
          translateY.setValue(nextY);
          opacity.setValue(Math.max(0.35, 1 - Math.abs(nextY) / 80));
        },
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy >= 24 || gesture.vy >= 0.7) {
            requestDismiss(renderedToastRef.current?.id);
            return;
          }

          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 0,
              duration: reduceMotion ? 0 : REDUCED_MOTION_DURATION,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: REDUCED_MOTION_DURATION,
              useNativeDriver: true,
            }),
          ]).start(() => resumeTimer("touch"));
        },
        onPanResponderTerminate: () => {
          translateY.setValue(0);
          opacity.setValue(1);
          resumeTimer("touch");
        },
      }),
    [opacity, pauseTimer, reduceMotion, requestDismiss, resumeTimer, translateY]
  );

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);

    const supportsReduceTransparency =
      typeof AccessibilityInfo.isReduceTransparencyEnabled === "function";
    if (supportsReduceTransparency) {
      void AccessibilityInfo.isReduceTransparencyEnabled()
        .then(setReduceTransparency)
        .catch(() => undefined);
    }

    void AccessibilityInfo.isScreenReaderEnabled()
      .then(setScreenReaderEnabled)
      .catch(() => setScreenReaderEnabled(false));

    const motionSubscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    const transparencySubscription = supportsReduceTransparency
      ? AccessibilityInfo.addEventListener(
          "reduceTransparencyChanged",
          setReduceTransparency
        )
      : null;
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReaderEnabled
    );

    return () => {
      motionSubscription.remove();
      transparencySubscription?.remove();
      screenReaderSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState === "active") {
        resumeTimer("app");
      } else {
        pauseTimer("app");
      }
    });

    return () => subscription.remove();
  }, [pauseTimer, resumeTimer]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const handleKeyboardShow = (event: KeyboardEvent) => {
      if (Platform.OS === "ios") {
        Keyboard.scheduleLayoutAnimation(event);
        setKeyboardHeight(event.endCoordinates.height);
        return;
      }

      androidKeyboardTopRef.current = event.endCoordinates.screenY;
      requestAnimationFrame(measureAndroidKeyboardOverlap);
      if (androidMeasureTimerRef.current) {
        clearTimeout(androidMeasureTimerRef.current);
      }
      androidMeasureTimerRef.current = setTimeout(
        measureAndroidKeyboardOverlap,
        150
      );
    };
    const handleKeyboardHide = (event: KeyboardEvent) => {
      if (Platform.OS === "ios") {
        Keyboard.scheduleLayoutAnimation(event);
        setKeyboardHeight(0);
        return;
      }

      androidKeyboardTopRef.current = null;
      setAndroidKeyboardOverlap(0);
      if (androidMeasureTimerRef.current) {
        clearTimeout(androidMeasureTimerRef.current);
        androidMeasureTimerRef.current = null;
      }
    };

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (androidMeasureTimerRef.current) {
        clearTimeout(androidMeasureTimerRef.current);
      }
    };
  }, [measureAndroidKeyboardOverlap]);

  useEffect(() => {
    return subscribeToast(({ current, bottomInset: nextBottomInset }) => {
      setBottomInset(nextBottomInset);
      desiredToastRef.current = current;
      const rendered = renderedToastRef.current;

      if (rendered?.id === current?.id) {
        renderedToastRef.current = current;
        setRenderedToast(current);
        return;
      }

      if (!rendered) {
        displayToast(current);
        return;
      }

      animateOut(() => {
        displayToast(desiredToastRef.current);
      });
    });
  }, [animateOut, displayToast]);

  useEffect(() => {
    if (!renderedToast || screenReaderEnabled == null) return;

    if (durationToastIdRef.current !== renderedToast.id) {
      durationToastIdRef.current = renderedToast.id;
      remainingDurationRef.current = getToastDuration(
        renderedToast,
        screenReaderEnabled
      );
      AccessibilityInfo.announceForAccessibility(getAnnouncement(renderedToast));
    }

    scheduleTimer();
  }, [renderedToast, scheduleTimer, screenReaderEnabled]);

  useEffect(() => {
    return () => {
      clearTimer();
      opacity.stopAnimation();
      translateY.stopAnimation();
      scale.stopAnimation();
    };
  }, [clearTimer, opacity, scale, translateY]);

  const handleActionPress = useCallback(async () => {
    const toast = renderedToastRef.current;
    if (!toast?.action || actionPendingRef.current) return;

    actionPendingRef.current = true;
    setActionPending(true);
    pauseTimer("action");

    try {
      await toast.action.onPress();
      requestDismiss(toast.id);
    } catch {
      actionPendingRef.current = false;
      setActionPending(false);
      resumeTimer("action");
    }
  }, [pauseTimer, requestDismiss, resumeTimer]);

  const restingBottom =
    bottomInset > 0 ? bottomInset : Math.max(insets.bottom, t.spacing.sm);
  const keyboardSpacing = bottomInset > 0 ? bottomInset : t.spacing.sm;
  const viewportBottom = androidKeyboardOverlap > 0
    ? androidKeyboardOverlap + keyboardSpacing
    : keyboardHeight > 0
      ? keyboardHeight + (bottomInset > 0 ? bottomInset : t.spacing.sm)
      : restingBottom;

  const toastViewport = renderedToast ? (
    <View
      pointerEvents="box-none"
      style={[styles.viewport, { bottom: viewportBottom }]}
    >
      <Animated.View
        {...panResponder.panHandlers}
        onTouchStart={() => pauseTimer("touch")}
        onTouchEnd={() => resumeTimer("touch")}
        onTouchCancel={() => resumeTimer("touch")}
        style={[
          styles.animatedCard,
          {
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <ToastCard
          toast={renderedToast}
          reduceTransparency={reduceTransparency}
          actionPending={actionPending}
          onActionPress={handleActionPress}
        />
      </Animated.View>
    </View>
  ) : null;

  if (Platform.OS !== "android") return toastViewport;

  return (
    <View
      collapsable={false}
      onLayout={measureAndroidKeyboardOverlap}
      pointerEvents="box-none"
      ref={hostRef}
      style={styles.host}
    >
      {toastViewport}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
  },
  viewport: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1_000,
    elevation: 1_000,
    alignItems: "center",
  },
  animatedCard: {
    width: "100%",
    maxWidth: 430,
  },
});
