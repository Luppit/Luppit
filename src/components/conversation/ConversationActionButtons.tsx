import { Icon } from "@/src/components/Icon";
import { LucideIconName } from "@/src/icons/lucide";
import { useTheme } from "@/src/themes";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../Text";
import { createConversationActionButtonsStyles } from "./styles";

export type ConversationActionButtonTone = "primary" | "secondary" | "danger";

export type ConversationActionButtonConfig = {
  id: string;
  label: string;
  helperText?: string | null;
  icon: LucideIconName;
  tone: ConversationActionButtonTone;
};

type ConversationActionButtonsProps = {
  buttons: ConversationActionButtonConfig[];
  disabled?: boolean;
  loadingButtonId?: string | null;
  onPress?: (id: string) => void;
};

export default function ConversationActionButtons({
  buttons,
  disabled = false,
  loadingButtonId,
  onPress,
}: ConversationActionButtonsProps) {
  const t = useTheme();
  const s = React.useMemo(() => createConversationActionButtonsStyles(t), [t]);
  const { fontScale, width } = useWindowDimensions();
  const shouldStackActions =
    buttons.length > 2 || fontScale >= 1.35 || width < 350;

  if (buttons.length === 0) return null;

  return (
    <View style={s.container}>
      <View style={[s.actions, shouldStackActions && s.actionsStacked]}>
        {buttons.map((button) => {
          const isLoading = loadingButtonId === button.id;
          const isDisabled = disabled || isLoading;
          const isPrimary = button.tone === "primary";
          const isDanger = button.tone === "danger";
          const contentColor = isPrimary
            ? t.colors.backgroudWhite
            : isDanger
              ? t.colors.error
              : t.colors.textDark;

          return (
            <Pressable
              key={button.id}
              accessibilityRole="button"
              accessibilityLabel={button.label}
              accessibilityState={{ disabled: isDisabled, busy: isLoading }}
              disabled={isDisabled}
              onPress={() => onPress?.(button.id)}
              style={({ pressed }) => [
                s.button,
                shouldStackActions || buttons.length === 1
                  ? s.buttonFull
                  : s.buttonEqual,
                isPrimary
                  ? s.buttonPrimary
                  : isDanger
                    ? s.buttonDanger
                    : s.buttonSecondary,
                pressed && s.buttonPressed,
                isDisabled && s.buttonDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={contentColor} />
              ) : (
                <Icon name={button.icon} size={20} color={contentColor} />
              )}
              <Text
                variant="body"
                align="center"
                maxLines={2}
                maxFontSizeMultiplier={2}
                style={[
                  s.label,
                  isPrimary
                    ? s.labelPrimary
                    : isDanger
                      ? s.labelDanger
                      : null,
                ]}
              >
                {button.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
