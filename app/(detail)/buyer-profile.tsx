import { Icon } from "@/src/components/Icon";
import { GroupedListRow, GroupedListSection } from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import ProfilePicture from "@/src/components/profile/ProfilePicture";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  getCurrentSellerVisibleBuyerProfile,
  SellerVisibleBuyerProfile,
} from "@/src/services/buyer-profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { useGlobalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

export default function BuyerProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = useMemo(() => styles(t, topInset), [t, topInset]);
  const params = useGlobalSearchParams<{ conversationId?: string | string[] }>();
  const rawId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;
  const conversationId = rawId?.trim() ?? "";
  const [profile, setProfile] = useState<SellerVisibleBuyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getCurrentSellerVisibleBuyerProfile(conversationId);
    if (!result.ok) {
      setProfile(null);
      setError(result.error.message);
      showError("No se pudo cargar el comprador", result.error.message);
    } else {
      setProfile(result.data);
    }
    setLoading(false);
  }, [conversationId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState label="Cargando comprador..." style={s.center} />;
  if (!profile || error) {
    return (
      <View style={s.center}>
        <Icon name="user" size={28} color={t.colors.stateAnulated} />
        <Text variant="subtitle" align="center">No se pudo cargar el comprador</Text>
        <Text color="stateAnulated" align="center">{error}</Text>
      </View>
    );
  }

  const { buyer } = profile;
  const rating = buyer.rating != null && buyer.numRatings > 0
    ? `${buyer.rating.toFixed(1)} (${buyer.numRatings} calificaciones)`
    : "Sin calificaciones";
  return (
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        <ProfilePicture kind="buyer" name={buyer.name} imagePath={buyer.imagePath} imageUrl={buyer.imageUrl} size={72} />
        <Text variant="title" maxLines={2} style={{ flex: 1 }}>{buyer.name}</Text>
      </View>
      <GroupedListSection title="Datos generales">
        <GroupedListRow icon="user" label="Nombre" value={buyer.name} showSeparator={false} />
      </GroupedListSection>
      <GroupedListSection title="Reputación">
        <GroupedListRow icon="star" label="Rating como comprador" value={rating} showSeparator={false} />
      </GroupedListSection>
    </ScrollView>
  );
}

function styles(t: Theme, topInset: number) {
  return StyleSheet.create({
    content: { gap: t.spacing.lg, paddingTop: topInset + t.spacing.md, paddingBottom: t.spacing.xl },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: t.spacing.sm, paddingTop: topInset },
    hero: { minHeight: 104, ...createRoundedSurfaceStyle(t), padding: t.spacing.md, flexDirection: "row", alignItems: "center", gap: t.spacing.md },
  });
}
