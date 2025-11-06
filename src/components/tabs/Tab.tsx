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
};

export function Tabs({ tabs }: TabsProps) {
  const t = useTheme();
  const s = useMemo(() => createTabsStyles(t), [t]);

  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <View>
      <View style={s.base.container}>
        {tabs.map((tab, index) => (
          <Pressable
            style={{
              ...s.header.tabsContainer,
              ...(index === currentIndex ? s.header.tabsContainerActive : {}),
            }}
            key={index}
            onPress={() => setCurrentIndex(index)}
          >
            <Text>{tab.title}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.content.container}>{tabs[currentIndex].content}</View>
    </View>
  );
}
