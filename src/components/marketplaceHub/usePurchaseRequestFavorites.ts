import {
  addCurrentBuyerPurchaseRequestFavorite,
  addCurrentSellerPurchaseRequestFavorite,
  getCurrentBuyerPurchaseRequestFavorites,
  getCurrentSellerPurchaseRequestFavorites,
  MarketplaceHubRole,
  removeCurrentBuyerPurchaseRequestFavorite,
  removeCurrentSellerPurchaseRequestFavorite,
} from "@/src/services/purchase.request.service";
import { showError, showInfo, showSuccess } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";

export default function usePurchaseRequestFavorites(role: MarketplaceHubRole) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const pendingIdsRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const result =
      role === "buyer"
        ? await getCurrentBuyerPurchaseRequestFavorites()
        : await getCurrentSellerPurchaseRequestFavorites();

    if (!result.ok) return;
    setFavoriteIds(new Set(result.data.map((item) => item.id)));
  }, [role]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {};
    }, [refresh])
  );

  const toggle = useCallback(
    async (purchaseRequestId: string) => {
      if (!purchaseRequestId || pendingIdsRef.current.has(purchaseRequestId)) return false;

      const wasFavorite = favoriteIds.has(purchaseRequestId);
      pendingIdsRef.current.add(purchaseRequestId);
      setPendingIds((current) => new Set(current).add(purchaseRequestId));

      try {
        const result = wasFavorite
          ? role === "buyer"
            ? await removeCurrentBuyerPurchaseRequestFavorite(purchaseRequestId)
            : await removeCurrentSellerPurchaseRequestFavorite(purchaseRequestId)
          : role === "buyer"
            ? await addCurrentBuyerPurchaseRequestFavorite(purchaseRequestId)
            : await addCurrentSellerPurchaseRequestFavorite(purchaseRequestId);

        if (!result.ok) {
          showError(
            wasFavorite ? "No se pudo quitar de favoritos" : "No se pudo agregar a favoritos",
            result.error.message
          );
          return false;
        }

        setFavoriteIds((current) => {
          const next = new Set(current);
          if (wasFavorite) next.delete(purchaseRequestId);
          else next.add(purchaseRequestId);
          return next;
        });

        if (wasFavorite) {
          showSuccess("Favorito eliminado");
        } else if ("alreadyExists" in result.data && result.data.alreadyExists) {
          showInfo("Ya estaba en favoritos");
        } else {
          showSuccess("Favorito agregado");
        }

        return true;
      } finally {
        pendingIdsRef.current.delete(purchaseRequestId);
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(purchaseRequestId);
          return next;
        });
      }
    },
    [favoriteIds, role]
  );

  return { favoriteIds, pendingIds, refresh, toggle };
}
