import Button from "@/src/components/button/Button";
import {
  GroupedList,
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import ProfilePicture from "@/src/components/profile/ProfilePicture";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  getCurrentProfileImageTarget,
  removeCurrentProfileImage,
  saveCurrentProfileImage,
  type ProfileImageFile,
  type ProfileImageTarget,
} from "@/src/services/profile-image.service";
import { openPopup } from "@/src/services/popup.service";
import { showToast } from "@/src/services/toast.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";

const MAX_PROFILE_IMAGE_BYTES = 4_000_000;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function getFileExtension(name?: string | null, uri?: string | null) {
  const source = name?.trim() || uri?.split("?")[0] || "";
  return source.split(".").pop()?.toLowerCase() || null;
}

function getNormalizedImageName(asset: ImagePicker.ImagePickerAsset) {
  const mime = asset.mimeType?.split(";")[0]?.trim().toLowerCase() || null;
  const mimeExtension =
    mime === "image/jpeg" || mime === "image/jpg"
      ? "jpg"
      : mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : null;
  const sourceExtension = getFileExtension(asset.fileName, asset.uri);
  const extension =
    mimeExtension ??
    (sourceExtension && ALLOWED_IMAGE_EXTENSIONS.has(sourceExtension)
      ? sourceExtension
      : "jpg");
  return `profile-picture.${extension}`;
}

function isSupportedImage(asset: ImagePicker.ImagePickerAsset) {
  const mime = asset.mimeType?.split(";")[0]?.trim().toLowerCase() || null;
  const extension = getFileExtension(asset.fileName, asset.uri);
  const hasSupportedType = mime
    ? ALLOWED_IMAGE_MIME_TYPES.has(mime)
    : Boolean(extension && ALLOWED_IMAGE_EXTENSIONS.has(extension));
  const hasSupportedSize =
    typeof asset.fileSize !== "number" || asset.fileSize <= MAX_PROFILE_IMAGE_BYTES;

  return hasSupportedType && hasSupportedSize;
}

export default function ProfilePictureEditScreen() {
  const t = useTheme();
  const s = useMemo(() => createProfilePictureEditStyles(t), [t]);
  const { activeProfile, refreshProfiles } = useActiveProfile();
  const [target, setTarget] = useState<ProfileImageTarget | null>(null);
  const [draft, setDraft] = useState<ProfileImageFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasImageLoadError, setHasImageLoadError] = useState(false);
  const [showFallbackAfterMetadataClearFailure, setShowFallbackAfterMetadataClearFailure] =
    useState(false);

  const loadTarget = useCallback(async (showFailureToast = true) => {
    setIsLoading(true);
    setLoadError(null);

    const result = await getCurrentProfileImageTarget();
    if (!result.ok) {
      setTarget(null);
      setLoadError(result.error.message);
      setIsLoading(false);
      if (showFailureToast) {
        showError("No se pudo cargar la foto", result.error.message);
      }
      return;
    }

    setTarget(result.data);
    setDraft(null);
    setShowFallbackAfterMetadataClearFailure(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadTarget();
  }, [loadTarget]);

  const isBusiness = target?.kind === "business";
  const displayName = isBusiness
    ? activeProfile?.businessName || "negocio"
    : activeProfile?.profile.name || "comprador";
  const isBusy = isSaving || isRemoving;
  const hasCurrentPicture = Boolean(target?.imagePath || target?.imageUrl);
  const canSave = Boolean(draft && target?.canManage && !isBusy);

  const selectImage = async () => {
    if (!target?.canManage || isBusy) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      if (permission.canAskAgain) {
        showError(
          "Permiso necesario",
          "Permite el acceso a tus fotos para elegir una imagen."
        );
      } else {
        showToast({
          variant: "error",
          title: "Permiso necesario",
          description: "Activa el acceso a fotos desde la configuración del dispositivo.",
          action: {
            label: "Abrir configuración",
            onPress: () => Linking.openSettings(),
          },
        });
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsMultipleSelection: false,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset || !isSupportedImage(asset)) {
      showError(
        "Imagen no válida",
        "Usa una imagen JPG, PNG o WebP de hasta 4 MB."
      );
      return;
    }

    setDraft({
      uri: asset.uri,
      name: getNormalizedImageName(asset),
      mime: asset.mimeType ?? null,
      size: asset.fileSize ?? null,
    });
    setShowFallbackAfterMetadataClearFailure(false);
    setHasImageLoadError(false);
  };

  const saveImage = async () => {
    if (!draft || !target?.canManage || isBusy) return;

    setIsSaving(true);
    const result = await saveCurrentProfileImage(draft);
    setIsSaving(false);

    if (!result.ok) {
      showError("No se pudo guardar la foto", result.error.message);
      return;
    }

    setTarget(result.data);
    setDraft(null);
    setShowFallbackAfterMetadataClearFailure(false);
    if (target.kind === "buyer_profile") {
      await refreshProfiles(activeProfile?.profile.id);
    }
    showSuccess(isBusiness ? "Foto del negocio actualizada" : "Foto de perfil actualizada");
    router.back();
  };

  const confirmRemoveImage = () => {
    if (!target?.canManage || !hasCurrentPicture || isBusy) return;

    openPopup({
      type: "summary",
      title: isBusiness ? "Eliminar foto del negocio" : "Eliminar foto de perfil",
      icon: "trash-2",
      description: isBusiness
        ? "Se volverá a mostrar el ícono predeterminado del negocio."
        : "Se volverán a mostrar tus iniciales.",
      actions: [
        {
          id: "keep-profile-picture",
          label: "Volver",
          icon: "arrow-left",
        },
        {
          id: "remove-profile-picture",
          label: "Eliminar foto",
          icon: "trash-2",
          textColorKey: "error",
          iconColorKey: "error",
          showPendingState: true,
          onPress: async () => {
            setIsRemoving(true);
            const result = await removeCurrentProfileImage();
            setIsRemoving(false);

            if (!result.ok) {
              if (result.error.code === "profile_image_clear_retryable") {
                setShowFallbackAfterMetadataClearFailure(true);
                setHasImageLoadError(false);
              }
              showError("No se pudo eliminar la foto", result.error.message);
              return false;
            }

            setTarget(result.data);
            setDraft(null);
            setShowFallbackAfterMetadataClearFailure(false);
            if (target.kind === "buyer_profile") {
              await refreshProfiles(activeProfile?.profile.id);
            }
            showSuccess("Foto eliminada");
            setTimeout(() => router.back(), 0);
            return true;
          },
        },
      ],
    });
  };

  if (isLoading) {
    return <LoadingState label="Cargando foto..." />;
  }

  if (loadError || !target) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <View style={s.errorSurface}>
          <View style={s.errorIcon}>
            <Icon name="alert-circle" size={22} color={t.colors.error} />
          </View>
          <Text variant="subtitle" align="center">
            No se pudo cargar la foto
          </Text>
          <Text color="stateAnulated" align="center">
            {loadError || "Intenta nuevamente."}
          </Text>
          <View style={s.fullWidth}>
            <Button title="Intentar de nuevo" onPress={() => void loadTarget(false)} />
          </View>
        </View>
      </ScrollView>
    );
  }

  if (!target.canManage) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <GroupedListSection title="Foto del negocio">
          <GroupedListRow
            icon="lock"
            label="Solo para el administrador principal"
            description="Tu perfil puede ver la foto, pero solo el administrador principal puede cambiarla."
            descriptionMaxLines={3}
            showSeparator={false}
          />
        </GroupedListSection>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <View style={s.section}>
        <Text variant="small" color="textMedium" style={s.sectionTitle}>
          Vista previa
        </Text>

        <View style={s.previewSurface}>
          <ProfilePicture
            key={showFallbackAfterMetadataClearFailure ? "metadata-clear-fallback" : "picture"}
            kind={isBusiness ? "business" : "buyer"}
            name={displayName}
            imagePath={
              draft || showFallbackAfterMetadataClearFailure ? null : target.imagePath
            }
            imageUrl={
              draft?.uri ??
              (showFallbackAfterMetadataClearFailure ? null : target.imageUrl)
            }
            size={144}
            onLoadErrorChange={setHasImageLoadError}
          />

          {hasImageLoadError && !draft ? (
            <Text variant="small" color="error" align="center">
              No se pudo cargar la foto actual. Puedes elegir otra.
            </Text>
          ) : null}

          <Text variant="small" color="textMedium" align="center">
            Usa una imagen JPG, PNG o WebP de hasta 4 MB. Podrás ajustar el recorte antes de guardar.
          </Text>

          <View style={s.actions}>
            <Button
              title={hasCurrentPicture || draft ? "Elegir otra foto" : "Elegir foto"}
              variant="white"
              icon="pencil"
              disabled={isBusy}
              onPress={() => void selectImage()}
            />
            <Button
              title="Guardar cambios"
              loading={isSaving}
              disabled={!canSave}
              onPress={() => void saveImage()}
            />
          </View>
        </View>
      </View>

      {hasCurrentPicture && !draft ? (
        <GroupedList>
          <GroupedListRow
            icon="trash-2"
            label="Eliminar foto"
            destructive
            showChevron={false}
            showSeparator={false}
            onPress={confirmRemoveImage}
          />
        </GroupedList>
      ) : null}
    </ScrollView>
  );
}

function createProfilePictureEditStyles(t: Theme) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      gap: t.spacing.lg,
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing.xl,
    },
    section: {
      gap: t.spacing.sm,
    },
    sectionTitle: {
      paddingLeft: t.spacing.md,
    },
    previewSurface: {
      ...createRoundedSurfaceStyle(t),
      alignItems: "center",
      padding: t.spacing.md,
      gap: t.spacing.md,
    },
    actions: {
      width: "100%",
      gap: t.spacing.sm,
    },
    fullWidth: {
      width: "100%",
    },
    errorSurface: {
      ...createRoundedSurfaceStyle(t),
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      padding: t.spacing.lg,
    },
    errorIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(165,33,0,0.10)",
    },
  });
}
