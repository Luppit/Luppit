import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { resolveProfileImageUrl } from "@/src/services/profile-image.service";
import { useTheme } from "@/src/themes";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

export type ProfilePictureKind = "buyer" | "business";

type ProfilePictureProps = {
  kind: ProfilePictureKind;
  name?: string | null;
  imagePath?: string | null;
  imageUrl?: string | null;
  size?: number;
  accessibilityLabel?: string;
  accessible?: boolean;
  style?: StyleProp<ViewStyle>;
  onLoadErrorChange?: (hasError: boolean) => void;
};

export type ProfilePictureSource = {
  imagePath: string | null;
  imageUrl: string | null;
};

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getProfilePictureSource(value: unknown): ProfilePictureSource {
  if (!value || typeof value !== "object") {
    return { imagePath: null, imageUrl: null };
  }

  const record = value as Record<string, unknown>;
  return {
    imagePath:
      toOptionalString(record.imagePath) ??
      toOptionalString(record.image_path) ??
      toOptionalString(record.profileImagePath) ??
      toOptionalString(record.profile_image_path),
    imageUrl:
      toOptionalString(record.imageUrl) ??
      toOptionalString(record.image_url) ??
      toOptionalString(record.profileImageUrl) ??
      toOptionalString(record.profile_image_url),
  };
}

export function hasProfilePicture(value: unknown) {
  const source = getProfilePictureSource(value);
  return Boolean(source.imagePath || source.imageUrl);
}

function getInitials(name?: string | null) {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "?";
}

function useProfilePictureUrl(imagePath?: string | null, imageUrl?: string | null) {
  const normalizedPath = imagePath?.trim() || null;
  const normalizedUrl = imageUrl?.trim() || null;
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(normalizedUrl);
  const [isResolving, setIsResolving] = useState(Boolean(normalizedPath && !normalizedUrl));
  const [hasResolutionError, setHasResolutionError] = useState(false);

  useEffect(() => {
    let active = true;

    if (normalizedUrl) {
      setResolvedUrl(normalizedUrl);
      setIsResolving(false);
      setHasResolutionError(false);
      return () => {
        active = false;
      };
    }

    if (!normalizedPath) {
      setResolvedUrl(null);
      setIsResolving(false);
      setHasResolutionError(false);
      return () => {
        active = false;
      };
    }

    setResolvedUrl(null);
    setIsResolving(true);
    setHasResolutionError(false);

    void Promise.resolve(resolveProfileImageUrl(normalizedPath))
      .then((url) => {
        if (!active) return;
        setResolvedUrl(url);
        setHasResolutionError(!url);
      })
      .catch(() => {
        if (!active) return;
        setResolvedUrl(null);
        setHasResolutionError(true);
      })
      .finally(() => {
        if (active) setIsResolving(false);
      });

    return () => {
      active = false;
    };
  }, [normalizedPath, normalizedUrl]);

  return { resolvedUrl, isResolving, hasResolutionError };
}

export default function ProfilePicture({
  kind,
  name,
  imagePath,
  imageUrl,
  size = 48,
  accessibilityLabel,
  accessible = true,
  style,
  onLoadErrorChange,
}: ProfilePictureProps) {
  const t = useTheme();
  const { resolvedUrl, isResolving, hasResolutionError } = useProfilePictureUrl(
    imagePath,
    imageUrl
  );
  const [isImageLoading, setIsImageLoading] = useState(Boolean(resolvedUrl));
  const [hasImageError, setHasImageError] = useState(false);
  const isBuyer = kind === "buyer";
  const radius = isBuyer ? size / 2 : Math.round(size * 0.29);
  const hasLoadError = hasResolutionError || hasImageError;
  const hasPicture = Boolean((imagePath || imageUrl) && !hasLoadError);
  const resolvedAccessibilityLabel =
    accessibilityLabel ??
    (isBuyer
      ? `${hasPicture ? "Foto de perfil" : "Foto de perfil predeterminada"} de ${name?.trim() || "comprador"}`
      : `${hasPicture ? "Foto del negocio" : "Imagen predeterminada del negocio"}: ${name?.trim() || "negocio"}`);
  const containerStyle = useMemo<ViewStyle>(
    () => ({
      width: size,
      height: size,
      borderRadius: radius,
      borderWidth: isBuyer ? 1 : 0,
      borderColor: isBuyer ? t.colors.border : "transparent",
      backgroundColor: isBuyer ? t.colors.primaryLight : "rgba(131,163,30,0.14)",
    }),
    [isBuyer, radius, size, t.colors.border, t.colors.primaryLight]
  );

  useEffect(() => {
    setHasImageError(false);
    setIsImageLoading(Boolean(resolvedUrl));
  }, [resolvedUrl]);

  useEffect(() => {
    onLoadErrorChange?.(hasLoadError);
  }, [hasLoadError, onLoadErrorChange]);

  return (
    <View
      accessible={accessible}
      accessibilityRole={accessible ? "image" : undefined}
      accessibilityLabel={accessible ? resolvedAccessibilityLabel : undefined}
      accessibilityState={accessible ? { busy: isResolving || isImageLoading } : undefined}
      accessibilityElementsHidden={!accessible}
      importantForAccessibility={accessible ? "auto" : "no-hide-descendants"}
      style={[styles.container, containerStyle, style]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.fallback}
      >
        {isBuyer ? (
          <Text variant={size >= 96 ? "title" : "subtitle"} maxLines={1}>
            {getInitials(name)}
          </Text>
        ) : (
          <Icon
            name="house"
            size={Math.max(24, Math.round(size * 0.42))}
            color={t.colors.primary}
          />
        )}
      </View>

      {resolvedUrl && !hasImageError ? (
        <Image
          source={{ uri: resolvedUrl }}
          resizeMode="cover"
          onLoadStart={() => setIsImageLoading(true)}
          onLoadEnd={() => setIsImageLoading(false)}
          onError={() => {
            setHasImageError(true);
            setIsImageLoading(false);
          }}
          style={[styles.image, { borderRadius: radius }]}
          accessible={false}
        />
      ) : null}

      {isResolving || isImageLoading ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.loadingOverlay}
        >
          <ActivityIndicator size="small" color={t.colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.54)",
  },
});
