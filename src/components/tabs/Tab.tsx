import { useTheme } from "@/src/themes";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import GlassSurface from "../glass/GlassSurface";
import { Text } from "../Text";
import { createTabsStyles } from "./styles";

export type Tab = {
  title: string;
  content: React.ReactNode;
};

export type TabsProps = {
  tabs: Tab[];
  currentIndex?: number;
  onTabChange?: (index: number) => void;
};

export function Tabs({ tabs, currentIndex, onTabChange }: TabsProps) {
  const t = useTheme();
  const s = useMemo(() => createTabsStyles(t), [t]);

  const [internalIndex, setInternalIndex] = useState(0);
  const selectedIndex = currentIndex ?? internalIndex;

  const handleChange = (index: number) => {
    if (currentIndex === undefined) {
      setInternalIndex(index);
    }
    onTabChange?.(index);
  };

  return (
    <View>
      <GlassSurface
        variant="control"
        style={s.base.container}
        contentStyle={s.base.content}
      >
        {tabs.map((tab, index) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: index === selectedIndex }}
            style={({ pressed }) => [
              s.header.tabsContainer,
              index === selectedIndex ? s.header.tabsContainerActive : null,
              pressed ? s.header.tabsContainerPressed : null,
            ]}
            key={index}
            onPress={() => handleChange(index)}
          >
            <Text
              style={
                index === selectedIndex
                  ? s.header.tabLabelActive
                  : s.header.tabLabelInactive
              }
            >
              {tab.title}
            </Text>
          </Pressable>
        ))}
      </GlassSurface>
      <View style={s.content.container}>{tabs[selectedIndex].content}</View>
    </View>
  );
}
