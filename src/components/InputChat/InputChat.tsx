import { useTheme } from "@/src/themes";
import * as ImagePicker from "expo-image-picker";
import { ArrowUp, Paperclip, X } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import type { TextInputKeyPressEvent } from "react-native";
import {
  Image,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  TextInput,
  TextInputSubmitEditingEventData,
  View
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
  disabled?: boolean;
  autoFocus?: boolean;
  clearOnSend?: boolean;
  showImagePreview?: boolean;
  onSend: (payload: { text: string; images: ChatImage[] }) => void | Promise<void>;
  onPickImages?: () => Promise<ChatImage[] | void> | ChatImage[] | void;
  onImagesChange?: (images: ChatImage[]) => void;
};

export default function InputChat({
  placeholder = "Describe lo que necesitas",
  maxChars = 8000,
  maxImages = 10,
  disabled = false,
  autoFocus = false,
  clearOnSend = true,
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

  const MIN_INPUT_HEIGHT = 45;
  const MAX_INPUT_HEIGHT = 200;
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);


  const updateImages = useCallback(
    (updater: (prev: ChatImage[]) => ChatImage[]) => {
      setImages((prev) => {
        const next = updater(prev);
        onImagesChange?.(next);
        return next;
      });
    },
    [onImagesChange]
  );

  const removeImageAt = useCallback(
    (index: number) => {
      updateImages((prev) => prev.filter((_, i) => i !== index));
    },
    [updateImages]
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
    if (disabled || sending) return;

    if (onPickImages) {
      const result = await Promise.resolve(onPickImages());
      if (result && Array.isArray(result)) {
        updateImages(() => result.slice(0, maxImages));
      }
      return;
    }

    await handleDefaultPickImages();
  }, [disabled, sending, onPickImages, handleDefaultPickImages, maxImages, updateImages]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (disabled || sending) return;
    if (!trimmed && images.length === 0) return;

    try {
      setSending(true);
      await Promise.resolve(onSend({ text: trimmed, images }));

      if (clearOnSend) {
        setText("");
        updateImages(() => []);
        inputRef.current?.clear();
        setInputHeight(MIN_INPUT_HEIGHT); 
      }
    } finally {
      setSending(false);
    }
  }, [text, images, disabled, sending, clearOnSend, onSend, updateImages]);

  const handleSubmitEditing = useCallback(
    (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
      e.preventDefault();
      handleSend();
    },
    [handleSend]
  );

  const handleKeyPress = useCallback(
    (e: TextInputKeyPressEvent) => {
      if (e.nativeEvent.key === "Enter") {
        if (typeof e.preventDefault === "function") e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend = !disabled && !sending && (text.trim().length > 0 || images.length > 0);

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
                <View style={styles.previewCloseButton}>
                  <X
                    size={14}
                    color={t.colors.textDark}
                    onPress={() => removeImageAt(idx)}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.innerRow}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput,
              { height:inputHeight },
            ]}
            placeholder={placeholder}
            placeholderTextColor={t.colors.IconColorGray}
            value={text}
            onChangeText={(v) => setText(v.slice(0, maxChars))}
            editable={!disabled && !sending}
            autoFocus={autoFocus}
            multiline={true}
            returnKeyType="send"
            onKeyPress={handleKeyPress}
            onContentSizeChange={(e) => { 
              const newHeight = e.nativeEvent.contentSize.height;
              if (!text.trim()) {
                setInputHeight(MIN_INPUT_HEIGHT);
                return;
              }
              const clamped = Math.min(MAX_INPUT_HEIGHT, Math.max(MIN_INPUT_HEIGHT, newHeight));
              setInputHeight(clamped);
            }}
          />

          <View style={styles.buttonsContainer}>
            <Pressable style={styles.iconButton}>
              <Paperclip
                size={18}
                color={t.colors.IconColorGray}
                onPress={handlePickImages}
                hitSlop={8}
              />
            </Pressable>

            <Pressable style={styles.sendButton}>
              <ArrowUp
                size={18}
                color={t.colors.textDark}
                onPress={canSend ? handleSend : undefined}
                hitSlop={8}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
