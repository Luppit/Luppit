import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { Theme, useTheme } from "@/src/themes";
import React from "react";
import { LayoutAnimation, Platform, Pressable, UIManager, View } from "react-native";
import { createExpandableInfoCardStyles } from "./styles";

type ThemeColorKey = keyof Theme["colors"];

type ExpandableInfoCardProps = {
  title: string;
  description: string;
  backgroundColorKey: ThemeColorKey;
  textColorKey?: ThemeColorKey;
  initiallyExpanded?: boolean;
};

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ExpandableInfoCard({
  title,
  description,
  backgroundColorKey,
  textColorKey = "backgroudWhite",
  initiallyExpanded = false,
}: ExpandableInfoCardProps) {
  const t = useTheme();
  const s = React.useMemo(() => createExpandableInfoCardStyles(t), [t]);
  const [expanded, setExpanded] = React.useState(initiallyExpanded);
  const backgroundColor = t.colors[backgroundColorKey];
  const textColor = t.colors[textColorKey];

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((value) => !value);
  };

  return (
    <View style={[s.container, { backgroundColor }]}>
      <Pressable style={s.header} onPress={toggleExpanded}>
        <View style={s.headerLeft}>
          <Icon name="sparkles" size={18} color={textColor} />
          <Text variant="body" style={[s.title, { color: textColor }]}>
            {title}
          </Text>
        </View>
        <Icon
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={textColor}
        />
      </Pressable>

      {expanded ? (
        <View style={s.descriptionContainer}>
          <Text variant="body" color="textDark" style={s.description}>
            {description}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
