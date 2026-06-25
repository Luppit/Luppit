import { openPopup } from "@/src/services/popup.service";
import { MarketplaceHubRole } from "@/src/services/purchase.request.service";
import { Share } from "react-native";

type PurchaseRequestMenuItem = {
  id: string;
  title: string | null;
  category_name?: string | null;
  category_path?: string | null;
};

export function openPurchaseRequestCardMenu({
  item,
  role,
  isFavorite,
  onToggleFavorite,
}: {
  item: PurchaseRequestMenuItem;
  role: MarketplaceHubRole;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const favoriteOption = {
    id: "favorite",
    label: isFavorite ? "Quitar de favoritos" : "Añadir como favorito",
    icon: isFavorite ? ("star-off" as const) : ("star" as const),
    textColorKey: "textDark" as const,
    iconColorKey: "textDark" as const,
    onPress: onToggleFavorite,
  };

  if (role === "seller") {
    openPopup({ options: [favoriteOption] });
    return;
  }

  openPopup({
    options: [
      favoriteOption,
      {
        id: "category-info",
        label: "Información sobre categorías",
        icon: "circle-help",
        textColorKey: "textDark",
        iconColorKey: "textDark",
        onPress: () =>
          openPopup({
            type: "summary",
            title: item.category_name?.trim() || "Categoría",
            description:
              item.category_path?.trim() ||
              "Esta solicitud todavía no tiene información adicional de categoría.",
          }),
      },
      {
        id: "share",
        label: "Compartir",
        icon: "share-2",
        textColorKey: "textDark",
        iconColorKey: "textDark",
        onPress: () =>
          void Share.share({
            message: item.title?.trim() || "Solicitud en Luppit",
          }),
      },
    ],
  });
}
