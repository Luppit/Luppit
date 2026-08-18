import { Icon } from "@/src/components/Icon";
import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import ProfilePicture, {
  getProfilePictureSource,
  hasProfilePicture,
} from "@/src/components/profile/ProfilePicture";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import { formatLocationLabel } from "@/src/services/location.service";
import {
  SellerProfileOverview,
  getCurrentSellerProfileOverview,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

export default function BusinessProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { activeProfile } = useActiveProfile();
  const canManageBusiness = activeProfile?.membershipRole === "owner";
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = useMemo(
    () => createBusinessProfileStyles(t, topContentInset),
    [t, topContentInset]
  );
  const [overview, setOverview] = useState<SellerProfileOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    const profileResult = await getCurrentSellerProfileOverview();

    if (!profileResult.ok) {
      setOverview(null);
      setIsLoading(false);
      showError("No se pudo cargar el negocio", profileResult.error.message);
      return;
    }

    setOverview(profileResult.data);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
      return () => {};
    }, [loadOverview])
  );

  const business = overview?.business ?? null;
  const businessPicture = getProfilePictureSource(business);
  const selectedCategories = business?.categoryPreferences ?? [];
  const categoryLabel = getCategoryCountLabel(selectedCategories.length);
  const locationLabel = formatLocationLabel(business?.location);
  const ratingLabel =
    typeof business?.rating === "number" && business.numRatings > 0
      ? `${business.rating.toFixed(1)} (${business.numRatings} calificaciones)`
      : "Sin calificaciones";

  const openCategoryEditor = () => {
    if (!canManageBusiness) return;

    router.push({
      pathname: "/(detail)/business-categories",
      params: {
        title: "Categorías de venta",
        hideMenu: "true",
      },
    });
  };

  if (isLoading) {
    return <LoadingState label="Cargando negocio..." style={s.loadingBox} />;
  }

  if (!business) {
    return (
      <View style={s.emptyState}>
        <View style={s.emptyIcon}>
          <Icon name="house" size={24} color={t.colors.primary} />
        </View>
        <Text variant="subtitle" align="center">
          No encontramos un negocio asociado
        </Text>
        <Text color="stateAnulated" align="center">
          Cuando el perfil tenga un negocio vinculado, la información aparecerá aquí.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <View style={s.hero}>
        <ProfilePicture
          kind="business"
          name={business.name}
          imagePath={businessPicture.imagePath}
          imageUrl={businessPicture.imageUrl}
          size={72}
        />
        <View style={s.heroText}>
          <Text variant="title" maxLines={2}>
            {business.name || "Negocio sin nombre"}
          </Text>
          <Text color="textMedium" maxLines={2}>
            {locationLabel}
          </Text>
        </View>
      </View>

      <GroupedListSection title="Datos generales">
        <GroupedListRow
          icon="house"
          label="Nombre comercial"
          value={business.name || "Sin nombre"}
          onPress={canManageBusiness
            ? () => router.push({
                pathname: "/(modal)/business-name-edit",
                params: {
                  title: "Nombre comercial",
                  value: business.name ?? "",
                },
              })
            : undefined}
        />
        <GroupedListRow
          icon="file-text"
          label="Documento de identificación"
          value={business.idDocument || "Sin documento"}
        />
        <GroupedListRow
          icon="map-pin"
          label="Ubicación"
          description={locationLabel}
          descriptionColor="textMedium"
          descriptionMaxLines={3}
          showSeparator={false}
          onPress={
            canManageBusiness
              ? () =>
                  router.push({
                    pathname: "/(modal)/business-location-edit",
                    params: {
                      title: "Editar ubicación",
                      locationId: business.location?.id ?? "",
                      locationLabel,
                    },
                  })
              : undefined
          }
        />
      </GroupedListSection>

      <GroupedListSection title="Reputación">
        <GroupedListRow
          icon="star"
          label="Rating del negocio"
          value={ratingLabel}
          showSeparator={false}
        />
      </GroupedListSection>

      {canManageBusiness ? (
        <GroupedListSection title="Administración">
          <GroupedListRow
            icon="house"
            label="Foto del negocio"
            description={
              hasProfilePicture(business)
                ? "Cambia la imagen que representa tu negocio."
                : "Agrega una imagen que represente tu negocio."
            }
            onPress={() =>
              router.push({
                pathname: "/(modal)/profile-picture-edit",
                params: { title: "Foto del negocio" },
              })
            }
          />
          <GroupedListRow
            icon="tag"
            label="Categorías de venta"
            description={
              selectedCategories.length === 0
                ? "Elige dónde recibir oportunidades."
                : categoryLabel
            }
            onPress={openCategoryEditor}
          />
          <GroupedListRow
            icon="user"
            label="Equipo"
            description="Consulta miembros e invitaciones pendientes."
            showSeparator={false}
            onPress={() =>
              router.push({
                pathname: "/(detail)/business-invitations",
                params: { title: "Equipo", hideMenu: "true" },
              })
            }
          />
        </GroupedListSection>
      ) : null}
    </ScrollView>
  );
}

function getCategoryCountLabel(count: number) {
  if (count === 0) return "Sin categorías configuradas";
  if (count === 1) return "1 categoría seleccionada";
  return `${count} categorías seleccionadas`;
}

function createBusinessProfileStyles(t: Theme, topContentInset = 0) {
  return StyleSheet.create({
    content: {
      gap: t.spacing.lg,
      paddingTop: topContentInset + t.spacing.sm,
      paddingBottom: t.spacing.xl,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingTop: topContentInset,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.lg,
      paddingTop: topContentInset,
    },
    emptyIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: "rgba(131,163,30,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    hero: {
      minHeight: 104,
      ...createRoundedSurfaceStyle(t),
      padding: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    heroText: {
      flex: 1,
      gap: t.spacing.xs,
    },
  });
}
