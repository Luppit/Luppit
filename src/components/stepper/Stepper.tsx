import { colors, useTheme } from "@/src/themes";
import React, {
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Icon } from "../Icon";
import { Text } from "../Text";
import { StepperKeyboardContext } from "./StepperKeyboardContext";
import { createStepperStyles } from "./styles";

export type StepApi = {
  next: () => void;
  back: () => void;
  index: number;
};

export type Step = {
  key?: string;
  title: string;
  description: string;
  isNextStepShown: boolean;
  render: (api: StepApi) => React.ReactNode;
};

export type StepperRef = {
  next: () => void;
  back: () => void;
  setStep: (index: number) => void;
  index: number;
};

export type StepperProps = {
  steps: Step[];
  initialStep?: number;
  onFinish: () => void;
  onBackAtFirstStep?: () => void;
  style?: StyleProp<ViewStyle>;
};

const Stepper = forwardRef<StepperRef, StepperProps>(
  ({ steps, initialStep = 0, onFinish, onBackAtFirstStep, style }, ref) => {
    const t = useTheme();
    const s = useMemo(() => createStepperStyles(t), [t]);
    const scrollViewRef = useRef<ScrollView | null>(null);
    const [currentStep, setCurrentStep] = useState<number>(initialStep);
    const totalSteps = steps.length;

    const goNext = useCallback(() => {
      if (currentStep < totalSteps - 1) setCurrentStep((i) => i + 1);
      else onFinish?.();
    }, [currentStep, onFinish, totalSteps]);

    const goBack = useCallback(() => {
      if (currentStep === 0) onBackAtFirstStep?.();
      else setCurrentStep((i) => i - 1);
    }, [currentStep, onBackAtFirstStep]);

    useImperativeHandle(
      ref,
      () => ({
        next: goNext,
        back: goBack,
        setStep: (i: number) => {
          if (i >= 0 && i < totalSteps) setCurrentStep(i);
        },
        get index() {
          return currentStep;
        },
      }),
      [currentStep, goBack, goNext, totalSteps]
    );

    const progress = useMemo(
      () => (currentStep + 1) / totalSteps,
      [currentStep, totalSteps]
    );
    const current = steps[currentStep];
    const scrollToFocusedInput = useCallback(
      (target?: unknown | null) => {
        if (target == null) return;

        const scrollToTarget = () => {
          scrollViewRef.current?.scrollResponderScrollNativeHandleToKeyboard(
            target,
            t.spacing.lg,
            true,
          );
        };

        requestAnimationFrame(scrollToTarget);
        setTimeout(scrollToTarget, 150);
      },
      [t.spacing.lg],
    );

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[s.base.parent, style]}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={s.base.scrollContent}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            style={s.base.scroll}
          >
            <StepperKeyboardContext.Provider value={{ scrollToFocusedInput }}>
              <View style={s.header.container}>
                {/* Header */}
                <View style={s.header.icon}>
                  <Pressable onPress={goBack}>
                    <Icon name="arrow-left" size={20}></Icon>
                  </Pressable>
                </View>
                <View style={s.header.content}>
                  <ProgressCircle
                    progress={progress}
                    currentStep={currentStep + 1}
                    totalSteps={totalSteps}
                  ></ProgressCircle>
                  <View style={s.header.contentInfo}>
                    <Text variant="subtitle">{current.title}</Text>
                    <Text variant="caption" color="stateAnulated">
                      <Text
                        variant="caption"
                        color="stateAnulated"
                        style={{ fontWeight: "bold" }}
                      >
                        Siguiente paso:{" "}
                      </Text>
                      {current.isNextStepShown
                        ? steps[currentStep + 1]?.title || current.description
                        : current.description}
                    </Text>
                  </View>
                </View>
                {/* Content */}
                <View style={s.base.contentContainer}>
                  {current.render({ next: goNext, back: goBack, index: currentStep })}
                </View>
              </View>
            </StepperKeyboardContext.Provider>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }
);

Stepper.displayName = "Stepper";

export default Stepper;

function ProgressCircle({
  progress,
  currentStep,
  totalSteps,
  size = 60,
  stroke = 6,
}: {
  progress: number;
  currentStep: number;
  totalSteps: number;
  size?: number;
  stroke?: number;
}) {
  const t = useTheme();
  const s = useMemo(() => createStepperStyles(t), [t]);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * progress;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={{ width: size, height: size, marginRight: 10 }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.primaryLight}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash}, ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View style={s.circle.counterCenter}>
        <Text variant="caption">
          {currentStep} / {totalSteps}
        </Text>
      </View>
    </View>
  );
}
