import { useTheme } from "@/src/themes";
import * as ImagePicker from "expo-image-picker";
import { ArrowUp, Paperclip, X } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import type { TextInputKeyPressEvent } from "react-native";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { createInputChatStyles } from "./styles";

export type ChatImage = {
  uri: string;
  mime?: string | null;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  name?: string | null;
};

export type InputChatProps = {
  placeholder?: string;
  maxChars?: number;
  maxImages?: number;
  showAttachmentButton?: boolean;
  disabled?: boolean;
  busy?: boolean;
  autoFocus?: boolean;
  clearOnSend?: boolean;
  clearOnSendStart?: boolean;
  showImagePreview?: boolean;
  onSend: (payload: {
    text: string;
    images: ChatImage[];
  }) => void | Promise<void>;
  onPickImages?: () => Promise<ChatImage[] | void> | ChatImage[] | void;
  onImagesChange?: (images: ChatImage[]) => void;
};

export default function InputChat({
  placeholder = "Describe lo que necesitas",
  maxChars = 8000,
  maxImages = 10,
  showAttachmentButton = true,
  disabled = false,
  busy = false,
  autoFocus = false,
  clearOnSend = true,
  clearOnSendStart = false,
  showImagePreview = true,
  onSend,
  onPickImages,
  onImagesChange,
}: InputChatProps) {
  const t = useTheme();
  const styles = createInputChatStyles(t);

  const [text, setText] = useState("");
  const [images, setImages] = useState<ChatImage[]>([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isBusy = busy || sending;
  const isBlocked = disabled || isBusy;

  const updateImages = useCallback(
    (updater: (prev: ChatImage[]) => ChatImage[]) => {
      setImages((prev) => {
        const next = updater(prev);
        onImagesChange?.(next);
        return next;
      });
    },
    [onImagesChange],
  );

  const clearInput = useCallback(() => {
    setText("");
    updateImages(() => []);
    inputRef.current?.clear();
  }, [updateImages]);

  const removeImageAt = useCallback(
    (index: number) => {
      updateImages((prev) => prev.filter((_, i) => i !== index));
    },
    [updateImages],
  );

  const handleDefaultPickImages = useCallback(async () => {
    const remaining = maxImages - images.length;
    if (remaining <= 0) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      // tu solución: solo imágenes
      mediaTypes: ["images"] as any,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.9,
    });

    if (res.canceled) return;

    const mapped: ChatImage[] = res.assets.map((it) => ({
      uri: it.uri,
      mime: it.mimeType ?? null,
      width: it.width ?? null,
      height: it.height ?? null,
      size: it.fileSize ?? null,
      name: it.fileName ?? null,
    }));

    updateImages((prev) => [...prev, ...mapped].slice(0, maxImages));
  }, [images.length, maxImages, updateImages]);

  const handlePickImages = useCallback(async () => {
    if (isBlocked) return;

    if (onPickImages) {
      const result = await Promise.resolve(onPickImages());
      if (result && Array.isArray(result)) {
        updateImages(() => result.slice(0, maxImages));
      }
      return;
    }

    await handleDefaultPickImages();
  }, [
    isBlocked,
    onPickImages,
    handleDefaultPickImages,
    maxImages,
    updateImages,
  ]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (isBlocked) return;
    if (!trimmed && images.length === 0) return;

    try {
      setSending(true);
      if (clearOnSend && clearOnSendStart) {
        clearInput();
      }

      await Promise.resolve(onSend({ text: trimmed, images }));

      if (clearOnSend && !clearOnSendStart) {
        clearInput();
      }
    } finally {
      setSending(false);
    }
  }, [
    text,
    images,
    isBlocked,
    clearOnSend,
    clearOnSendStart,
    clearInput,
    onSend,
  ]);

  const handleKeyPress = useCallback(
    (e: TextInputKeyPressEvent) => {
      if (e.nativeEvent.key === "Enter") {
        if (typeof e.preventDefault === "function") e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleTextChange = useCallback(
    (value: string) => {
      setText(value.slice(0, maxChars));
    },
    [maxChars],
  );

  const canSend =
    !isBlocked && (text.trim().length > 0 || images.length > 0);
  const measureText =
    text.length === 0 ? " " : text.endsWith("\n") ? `${text} ` : text;

  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        {showImagePreview && images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewRow}
          >
            {images.map((img, idx) => (
              <View key={idx} style={styles.previewItem}>
                <Image source={{ uri: img.uri }} style={styles.previewImage} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quitar imagen"
                  hitSlop={8}
                  onPress={() => removeImageAt(idx)}
                  style={styles.previewCloseButton}
                >
                  <X
                    size={14}
                    color={t.colors.textDark}
                  />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.innerRow}>
          <View style={styles.inputArea}>
            <Text
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.textInput, styles.textMeasure]}
            >
              {measureText}
            </Text>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, styles.textInputOverlay]}
              placeholder={placeholder}
              placeholderTextColor={t.colors.stateAnulated}
              value={text}
              onChangeText={handleTextChange}
              editable={!isBlocked}
              accessibilityLabel="Mensaje"
              autoFocus={autoFocus}
              multiline={true}
              returnKeyType="send"
              scrollEnabled
              textAlignVertical="top"
              onKeyPress={handleKeyPress}
            />
          </View>

          <View style={styles.buttonsContainer}>
            {showAttachmentButton ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adjuntar imágenes"
                accessibilityState={{ disabled: isBlocked }}
                disabled={isBlocked}
                onPress={handlePickImages}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && !isBlocked ? styles.iconButtonPressed : null,
                  isBlocked ? styles.iconButtonDisabled : null,
                ]}
              >
                <Paperclip
                  size={20}
                  color={isBlocked ? t.colors.border : t.colors.IconColorGray}
                />
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isBusy ? "Pensando" : "Enviar mensaje"}
              accessibilityState={{ disabled: !canSend, busy: isBusy }}
              disabled={!canSend}
              onPress={handleSend}
              style={({ pressed }) => [
                styles.sendButton,
                !canSend ? styles.sendButtonDisabled : null,
                isBusy ? styles.sendButtonBusy : null,
                pressed && canSend ? styles.sendButtonPressed : null,
              ]}
              hitSlop={8}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={t.colors.backgroudWhite} />
              ) : (
                <ArrowUp
                  size={20}
                  color={canSend ? t.colors.backgroudWhite : t.colors.IconColorGray}
                />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
