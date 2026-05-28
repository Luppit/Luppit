import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import GlassSurface from "@/src/components/glass/GlassSurface";
import { openPopup } from "@/src/services/popup.service";
import {
  addCurrentBuyerPurchaseRequestFavorite,
  getCurrentBuyerPurchaseRequestFavoriteStatus,
  removeCurrentBuyerPurchaseRequestFavorite,
} from "@/src/services/purchase.request.service";
import { useTheme } from "@/src/themes";
import { showError, showInfo, showSuccess } from "@/src/utils/useToast";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";

type DetailTopBarProps = {
  title?: string;
  hideMenu?: boolean;
  purchaseRequestId?: string | null;
  topInset: number;
};

export const DETAIL_TOP_BAR_VISIBLE_HEIGHT = 72;

export default function DetailTopBar({
  title,
  hideMenu = false,
  purchaseRequestId,
  topInset,
}: DetailTopBarProps) {
  const t = useTheme();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);

  useEffect(() => {
    let active = true;

    const loadFavoriteStatus = async () => {
      if (!purchaseRequestId) {
        setIsFavorite(false);
        return;
      }

      const result = await getCurrentBuyerPurchaseRequestFavoriteStatus(purchaseRequestId);
      if (!active || !result.ok) return;
      setIsFavorite(result.data);
    };

    void loadFavoriteStatus();

    return () => {
      active = false;
    };
  }, [purchaseRequestId]);

  const handleFavoritePress = useCallback(async () => {
    if (isSavingFavorite) return;

    if (!purchaseRequestId) {
      showError("No se pudo actualizar", "No encontramos esta solicitud.");
      return;
    }

    setIsSavingFavorite(true);
    try {
      if (isFavorite) {
        const result = await removeCurrentBuyerPurchaseRequestFavorite(purchaseRequestId);

        if (!result.ok) {
          showError("No se pudo quitar de favoritos", result.error.message);
          return;
        }

        if (!result.data.removed) {
          showInfo("Ya no estaba en favoritos");
          setIsFavorite(false);
          return;
        }

        setIsFavorite(false);
        showSuccess("Favorito eliminado");
        return;
      }

      const result = await addCurrentBuyerPurchaseRequestFavorite(purchaseRequestId);

      if (!result.ok) {
        showError("No se pudo agregar a favoritos", result.error.message);
        return;
      }

      setIsFavorite(true);
      if (result.data.alreadyExists) {
        showInfo("Ya estaba en favoritos");
        return;
      }
      showSuccess("Favorito agregado");
    } finally {
      setIsSavingFavorite(false);
    }
  }, [isFavorite, isSavingFavorite, purchaseRequestId]);

  return (
    <GlassSurface
      variant="chrome"
      blur="chrome"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        elevation: 10,
        height: topInset + DETAIL_TOP_BAR_VISIBLE_HEIGHT,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: t.glass.radius.chrome,
        borderBottomRightRadius: t.glass.radius.chrome,
      }}
      clipStyle={{
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: t.glass.radius.chrome,
        borderBottomRightRadius: t.glass.radius.chrome,
        overflow: "hidden",
      }}
      contentStyle={{
        flex: 1,
        paddingTop: topInset + t.spacing.xs,
        paddingHorizontal: t.spacing.xl,
        paddingBottom: t.spacing.xs,
      }}
    >
      <View
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ width: 40, alignItems: "flex-start", justifyContent: "center" }}
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
                    label: isFavorite ? "Quitar de favoritos" : "Añadir como favorito",
                    icon: isFavorite ? "star-off" : "star",
                    textColorKey: "textDark",
                    iconColorKey: "textDark",
                    onPress: () => void handleFavoritePress(),
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
            style={{ width: 40, alignItems: "flex-end", justifyContent: "center" }}
          >
            <Icon name="ellipsis" size={28} />
          </Pressable>
        )}
      </View>
    </GlassSurface>
  );
}
