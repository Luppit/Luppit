import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { openPopup } from "@/src/services/popup.service";
import { useTheme } from "@/src/themes";
import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

type DetailTopBarProps = {
  title?: string;
  hideMenu?: boolean;
};

export default function DetailTopBar({ title, hideMenu = false }: DetailTopBarProps) {
  const t = useTheme();

  return (
    <View
      style={{
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: t.colors.background,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{ width: 40, alignItems: "flex-start" }}
      >
        <Icon name="arrow-left" size={28} />
      </Pressable>

      <Text variant="subtitle" align="center" maxLines={1} style={{ flex: 1 }}>
        {title ?? ""}
      </Text>

      {hideMenu ? (
        <View style={{ width: 40 }} />
      ) : (
        <Pressable
          onPress={() =>
            openPopup({
              options: [
                {
                  id: "favorite",
                  label: "Añadir como favorito",
                  icon: "star",
                  textColorKey: "textDark",
                  iconColorKey: "textDark",
                  onPress: () => console.log("detail popup: favorite"),
                },
                {
                  id: "category-info",
                  label: "Información sobre categorías",
                  icon: "circle-help",
                  textColorKey: "textDark",
                  iconColorKey: "textDark",
                  onPress: () => console.log("detail popup: category info"),
                },
                {
                  id: "share",
                  label: "Compartir",
                  icon: "share-2",
                  textColorKey: "textDark",
                  iconColorKey: "textDark",
                  onPress: () => console.log("detail popup: share"),
                },
                {
                  id: "cancel-request",
                  label: "Cancelar solicitud",
                  icon: "trash-2",
                  textColorKey: "error",
                  iconColorKey: "error",
                  onPress: () => console.log("detail popup: cancel request"),
                },
              ],
            })
          }
          hitSlop={12}
          style={{ width: 40, alignItems: "flex-end" }}
        >
          <Icon name="ellipsis" size={28} />
        </Pressable>
      )}
    </View>
  );
}
