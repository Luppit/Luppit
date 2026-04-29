import { Icon } from "@/src/components/Icon";
import { LucideIconName } from "@/src/icons/lucide";
import { Theme, useTheme } from "@/src/themes";
import React from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import { Text } from "../Text";
import { createConversationActionButtonsStyles } from "./styles";

type ThemeColorKey = keyof Theme["colors"];

export type ConversationActionButtonConfig = {
  id: string;
  label: string;
  icon: LucideIconName;
  backgroundColorKey?: ThemeColorKey;
  textColorKey?: ThemeColorKey;
  iconColorKey?: ThemeColorKey;
};

type ConversationActionButtonsProps = {
  buttons: ConversationActionButtonConfig[];
  onPress?: (id: string) => void;
};

export default function ConversationActionButtons({
  buttons,
  onPress,
}: ConversationActionButtonsProps) {
  const t = useTheme();
  const s = React.useMemo(() => createConversationActionButtonsStyles(t), [t]);
  const buttonsSignature = React.useMemo(
    () => buttons.map((button) => `${button.id}:${button.label}`).join("|"),
    [buttons]
  );
  const [maxButtonWidth, setMaxButtonWidth] = React.useState(0);

  React.useEffect(() => {
    setMaxButtonWidth(0);
  }, [buttonsSignature]);

  const handleButtonLayout = React.useCallback((event: LayoutChangeEvent) => {
    const width = Math.ceil(event.nativeEvent.layout.width);
    setMaxButtonWidth((currentWidth) =>
      width > currentWidth ? width : currentWidth
    );
  }, []);

  if (buttons.length === 0) return null;

  return (
    <View style={s.shadowWrapper}>
      <View style={s.container}>
        {buttons.map((button, index) => {
          const backgroundColor =
            button.backgroundColorKey != null
              ? t.colors[button.backgroundColorKey]
              : t.colors.backgroudWhite;
          const textColor =
            button.textColorKey != null
              ? t.colors[button.textColorKey]
              : t.colors.textDark;
          const iconColor =
            button.iconColorKey != null
              ? t.colors[button.iconColorKey]
              : textColor;

          return (
            <Pressable
              key={button.id}
              onPress={() => onPress?.(button.id)}
              onLayout={handleButtonLayout}
              style={{
                ...s.button,
                backgroundColor,
                ...(buttons.length > 1 && maxButtonWidth > 0
                  ? { minWidth: maxButtonWidth }
                  : null),
                ...(index === 0 ? null : s.divider),
              }}
            >
              <Icon name={button.icon} size={20} color={iconColor} />
              <Text style={[s.label, { color: textColor }]}>
                {button.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
