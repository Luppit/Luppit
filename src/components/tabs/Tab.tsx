import { useTheme } from "@/src/themes";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
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
      <View style={s.base.container}>
        {tabs.map((tab, index) => (
          <Pressable
            style={{
              ...s.header.tabsContainer,
              ...(index === selectedIndex ? s.header.tabsContainerActive : {}),
            }}
            key={index}
            onPress={() => handleChange(index)}
          >
            <Text>{tab.title}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.content.container}>{tabs[selectedIndex].content}</View>
    </View>
  );
}
