import { GroupedListCountPill, GroupedListRow } from "@/src/components/groupedList/GroupedList";
import HomeShortcut from "@/src/components/marketplaceHub/HomeShortcut";
import { router } from "expo-router";
import React from "react";
import { usePendingRatings } from "./usePendingRatings";

export function openPendingRatings() {
  router.push({ pathname: "/(detail)/pending-ratings", params: {
    title: "Calificaciones pendientes", hideMenu: "true",
  } });
}

export default function PendingRatingsEntry({ home = false, enabled = true }: { home?: boolean; enabled?: boolean }) {
  const { data, error } = usePendingRatings(enabled);
  if (home) {
    if (!data || data.total === 0) return null;
    return <HomeShortcut icon="star" title={data.ui.title}
      description={`${data.ui.countLabel} · ${data.ui.homeActionLabel}`}
      accessibilityLabel={`${data.ui.title}, ${data.ui.countLabel}`}
      onPress={openPendingRatings} />;
  }
  return <GroupedListRow icon="star" label={data?.ui.title ?? "Calificaciones pendientes"}
    labelMaxLines={2} description={error ? "No se pudo cargar el contador. Toca para reintentar." : undefined}
    descriptionColor="textMedium" accessibilityLabel={data
      ? `${data.ui.title}, ${data.ui.countLabel}` : "Calificaciones pendientes"}
    rightAccessory={data ? <GroupedListCountPill count={data.total} /> : undefined}
    onPress={openPendingRatings} />;
}
