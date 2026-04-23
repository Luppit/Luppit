import { useTheme } from "@/src/themes";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, View } from "react-native";
import { Icon } from "../Icon";
import { Text } from "../Text";
import { createFilePickerStyles } from "./styles";

export type SelectedFile = {
  uri: string;
  name?: string | null;
  mime?: string | null;
  size?: number | null;
  isImage: boolean;
  id?: string | null;
  storagePath?: string | null;
  isExisting?: boolean;
};

export type FilePickerMode = "images" | "files";

type FilePickerProps = {
  label?: string;
  mode?: FilePickerMode;
  accept?: string[];
  maxFiles?: number;
  disabled?: boolean;
  value: SelectedFile[];
  onChange: (files: SelectedFile[]) => void;
};

export default function FilePicker({
  label = "Imágenes",
  mode = "images",
  accept,
  maxFiles = 10,
  disabled = false,
  value,
  onChange,
}: FilePickerProps) {
  const t = useTheme();
  const s = useMemo(() => createFilePickerStyles(t), [t]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const remaining = maxFiles - value.length;
  const canAddMore = !disabled && remaining > 0;

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.9,
    });

    if (res.canceled) return;

    const mapped: SelectedFile[] = res.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.fileName ?? null,
      mime: asset.mimeType ?? null,
      size: asset.fileSize ?? null,
      isImage: true,
    }));

    onChange([...value, ...mapped].slice(0, maxFiles));
  };

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      type: accept && accept.length > 0 ? accept : "*/*",
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const mapped: SelectedFile[] = result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name ?? null,
      mime: asset.mimeType ?? null,
      size: asset.size ?? null,
      isImage: (asset.mimeType ?? "").startsWith("image/"),
    }));

    onChange([...value, ...mapped].slice(0, maxFiles));
  };

  const openPicker = async () => {
    if (!canAddMore) return;
    if (mode === "files") {
      await pickFiles();
      return;
    }
    await pickImages();
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <View style={s.container}>
      <Text color="stateAnulated" style={s.label}>
        {label}
      </Text>

      <View style={s.box}>
        {value.length === 0 ? (
          <Pressable
            style={s.emptyState}
            onPress={openPicker}
            disabled={!canAddMore}
          >
            <View style={s.emptyIconWrapper}>
              <Icon name="folder-closed" size={16} color={t.colors.textDark} />
            </View>
            <Text variant="caption" style={s.emptyText} align="center">
              <Text variant="caption" style={s.highlightText}>
                Presiona aquí
              </Text>{" "}
              para agregar imágenes.
            </Text>
          </Pressable>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.horizontalRowContent}
          >
            <Pressable
              style={s.addTile}
              onPress={openPicker}
              disabled={!canAddMore}
            >
              <View style={s.addTileIcon}>
                <Icon name="plus" size={26} color={t.colors.stateAnulated} />
              </View>
            </Pressable>

            {value.map((file, index) => (
              <Pressable
                key={`${file.uri}-${index}`}
                style={s.fileTile}
                onPress={() => {
                  if (file.isImage) setPreviewUri(file.uri);
                }}
              >
                {file.isImage ? (
                  <Image source={{ uri: file.uri }} style={s.fileImage} />
                ) : (
                  <View style={s.fileFallback}>
                    <Icon
                      name="file-text"
                      size={18}
                      color={t.colors.textMedium}
                    />
                    <Text
                      variant="caption"
                      maxLines={2}
                      style={s.fileFallbackText}
                    >
                      {file.name ?? "Archivo"}
                    </Text>
                  </View>
                )}

                <Pressable
                  style={s.removeButton}
                  onPress={() => removeAt(index)}
                >
                  <Icon name="x" size={12} color={t.colors.textDark} />
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <Modal
        transparent
        visible={previewUri != null}
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <Pressable
          style={s.previewBackdrop}
          onPress={() => setPreviewUri(null)}
        >
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={s.previewImage} />
          ) : null}
          <View style={s.previewClose}>
            <Icon name="x" size={20} color={t.colors.backgroudWhite} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
