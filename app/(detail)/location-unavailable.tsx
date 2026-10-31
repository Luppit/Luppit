import Button from "@/src/components/button/Button";
import { GroupedListRow, GroupedListSection } from "@/src/components/groupedList/GroupedList";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import { usePushNotifications } from "@/src/components/notifications/PushNotificationProvider";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { getProfilePictureSource } from "@/src/components/profile/ProfilePicture";
import { Text } from "@/src/components/Text";
import { openPopup } from "@/src/services/popup.service";
import { getCurrentSellerLocationAvailability, type SellerLocationAvailability } from "@/src/services/seller.business.setup.service";
import { Theme, useTheme } from "@/src/themes";
import { openSignOutConfirmation } from "@/src/utils/openSignOutConfirmation";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

export default function LocationUnavailableScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => styles(t), [t]);
  const { activeProfile, profiles, refreshProfiles, switchProfile } = useActiveProfile();
  const [availability, setAvailability] = useState<SellerLocationAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enablingNotifications, setEnablingNotifications] = useState(false);
  const { permissionStatus, permissionCanAskAgain, enablePushNotifications,
    openPushNotificationSettings } = usePushNotifications();
  const needsNotificationSettings = !permissionCanAskAgain && permissionStatus !== "undetermined";

  const enableAvailabilityNotifications = async () => {
    setEnablingNotifications(true);
    try {
      if (needsNotificationSettings) await openPushNotificationSettings();
      else await enablePushNotifications();
    } catch {
      showError("No pudimos activar las notificaciones", "Intenta de nuevo desde los ajustes del dispositivo.");
    } finally {
      setEnablingNotifications(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const result = await getCurrentSellerLocationAvailability();
    if (!result.ok) {
      setLoadError(result.error.message);
      setAvailability(null);
    } else if (result.data.status !== "unavailable") {
      await refreshProfiles(activeProfile?.profile.id);
      router.replace("/(tabs)");
    } else {
      setAvailability(result.data);
    }
    setLoading(false);
  }, [activeProfile?.profile.id, refreshProfiles]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const changeProfile = () => openPopup({
    type: "profileSwitcher",
    profiles: profiles.map((profile) => ({
      id: profile.profile.id,
      title: profile.profile.name,
      subtitle: profile.role === "seller" ? profile.businessName || "Vendedor" : "Comprador",
      ...getProfilePictureSource(profile),
      unreadNotificationCount: profile.unreadCount,
      isActive: profile.profile.id === activeProfile?.profile.id,
      onPress: async () => { await switchProfile(profile.profile.id); },
    })),
  });

  if (loading) return <LoadingState label="Consultando disponibilidad..." />;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[
      s.content, { paddingTop: insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT + t.spacing.xl,
        paddingBottom: insets.bottom + t.spacing.xl },
    ]}>
      <View style={s.message}>
        <Icon name="map-pin" size={36} color={t.colors.primary} />
        <Text variant="title" align="center">Todavía no llegamos a tu zona</Text>
        <Text variant="body" color="textMedium" align="center" accessibilityLiveRegion="polite">
          {loadError || availability?.message || "No pudimos consultar la disponibilidad. Intenta de nuevo."}
        </Text>
        {availability?.notificationRequested ? (
          <Text variant="body" color="textMedium" align="center">
            Guardamos tu interés. Te avisaremos cuando Luppit esté disponible en tu zona.
          </Text>
        ) : null}
      </View>
      {availability ? (
        <GroupedListSection title="Ubicación del negocio">
          <GroupedListRow icon="map-pin" label={availability.locationLabel || "Ubicación seleccionada"}
            description={availability.canEdit ? "Puedes corregirla si seleccionaste otra zona por error." : "Solo el administrador principal puede cambiarla."}
            descriptionMaxLines={3} showSeparator={false}
            onPress={availability.canEdit ? () => router.push({ pathname: "/(modal)/business-location-edit",
              params: { title: "Editar ubicación", locationId: availability.locationId ?? "",
                locationLabel: availability.locationLabel ?? "" } }) : undefined}
          />
        </GroupedListSection>
      ) : <Button title="Intentar de nuevo" onPress={() => void load()} />}
      {availability?.notificationRequested ? (
        <GroupedListSection title="Aviso de disponibilidad">
          <GroupedListRow icon="bell"
            label={permissionStatus === "granted" ? "Notificaciones activadas" :
              needsNotificationSettings ? "Abrir ajustes de notificaciones" : "Activar notificaciones"}
            description="Recibe el aviso cuando Luppit llegue a tu provincia."
            descriptionMaxLines={3} showSeparator={false}
            onPress={permissionStatus !== "granted" && !enablingNotifications
              ? () => void enableAvailabilityNotifications() : undefined}
          />
        </GroupedListSection>
      ) : null}
      <GroupedListSection title="Cuenta">
        {profiles.length > 1 ? <GroupedListRow icon="user" label="Cambiar perfil" onPress={changeProfile} /> : null}
        <GroupedListRow icon="log-out" label="Cerrar sesión" showSeparator={false} onPress={openSignOutConfirmation} />
      </GroupedListSection>
    </ScrollView>
  );
}

function styles(t: Theme) {
  return StyleSheet.create({
    content: { paddingHorizontal: t.spacing.md, gap: t.spacing.xl },
    message: { alignItems: "center", gap: t.spacing.md },
  });
}
