import { Icon } from "@/src/components/Icon";
import LuppitChip from "@/src/components/chip/LuppitChip";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

type AssistantProcessingProgressProps = {
  title: string;
  steps: readonly string[];
  variant?: "thinking" | "steps";
  onStop?: () => void;
};

export default function AssistantProcessingProgress({
  title,
  steps,
  variant = "steps",
  onStop,
}: AssistantProcessingProgressProps) {
  const t = useTheme();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    setActiveStep(0);
    if (variant !== "steps") return;

    const timers = steps.slice(1).map((_, index) =>
      setTimeout(() => setActiveStep(index + 1), (index + 1) * 700)
    );

    return () => timers.forEach(clearTimeout);
  }, [steps, variant]);

  const stopAction = onStop ? (
    <LuppitChip
      bordered
      icon="square"
      label="Detener"
      accessibilityLabel="Detener respuesta"
      onPress={onStop}
      style={{ alignSelf: "flex-start" }}
    />
  ) : null;

  if (variant === "thinking") {
    return (
      <View
        style={{
          alignSelf: "flex-start",
          paddingVertical: t.spacing.xs,
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: t.spacing.sm,
        }}
      >
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLiveRegion="polite"
          accessibilityLabel="Luppit está pensando"
          accessibilityValue={{ text: "Procesando" }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: t.spacing.sm,
          }}
        >
          <ActivityIndicator size="small" color={t.colors.stateAnulated} />
          <Text variant="body" color="textMedium">
            Pensando…
          </Text>
        </View>
        {stopAction}
      </View>
    );
  }

  if (steps.length === 0) return null;

  return (
    <View
      style={{
        alignSelf: "stretch",
        paddingVertical: t.spacing.sm,
        gap: t.spacing.md,
      }}
    >
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${title}. ${steps[activeStep]}`}
        accessibilityValue={{ text: steps[activeStep] }}
        style={{ gap: t.spacing.md }}
      >
        <Text variant="subtitle">{title}</Text>

        <View>
          {steps.map((step, index) => {
            const isComplete = index < activeStep;
            const isActive = index === activeStep;

            return (
              <View
                key={step}
                style={{
                  minHeight: 60,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: t.spacing.md,
                }}
              >
                <View
                  style={{
                    width: 44,
                    alignItems: "center",
                  }}
                >
                  {index < steps.length - 1 ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: 36,
                        bottom: -24,
                        width: 2,
                        backgroundColor: t.colors.border,
                      }}
                    />
                  ) : null}

                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: isComplete ? 0 : 2,
                      borderColor: isActive
                        ? t.colors.textDark
                        : t.colors.stateAnulated,
                      backgroundColor: isComplete
                        ? t.colors.textDark
                        : t.colors.background,
                    }}
                  >
                    {isComplete ? (
                      <Icon
                        name="check"
                        size={18}
                        color={t.colors.backgroudWhite}
                        strokeWidth={2.5}
                      />
                    ) : isActive ? (
                      <ActivityIndicator size="small" color={t.colors.textDark} />
                    ) : null}
                  </View>
                </View>

                <Text
                  variant="body"
                  color={isActive || isComplete ? "textDark" : "stateAnulated"}
                  style={{
                    flex: 1,
                    paddingTop: t.spacing.xs,
                    fontFamily: isActive
                      ? t.typography.subtitle.fontFamily
                      : t.typography.body.fontFamily,
                  }}
                >
                  {step}
                </Text>
              </View>
            );
          })}
        </View>

        <Text variant="small" color="stateAnulated">
          Esto puede tomar unos segundos.
        </Text>
      </View>

      {stopAction}
    </View>
  );
}
