import { Icon } from "@/src/components/Icon";
import { useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, Share, View } from "react-native";

const COPY_FEEDBACK_DURATION_MS = 1500;

type MessageUtilitiesProps = {
  text: string | null | undefined;
  align?: "left" | "right";
  onRetry?: () => void;
  retryDisabled?: boolean;
};

export default function MessageUtilities({
  text,
  align = "left",
  onRetry,
  retryDisabled = false,
}: MessageUtilitiesProps) {
  const t = useTheme();
  const [isCopied, setIsCopied] = useState(false);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageText = text ?? "";
  const hasText = messageText.trim().length > 0;

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const copyMessage = useCallback(async () => {
    if (!hasText) return;

    try {
      await Clipboard.setStringAsync(messageText);
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
      setIsCopied(true);
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        copyFeedbackTimeoutRef.current = null;
      }, COPY_FEEDBACK_DURATION_MS);
      showSuccess("Mensaje copiado");
      AccessibilityInfo.announceForAccessibility("Mensaje copiado");
    } catch {
      showError("No se pudo copiar", "Intenta nuevamente.");
    }
  }, [hasText, messageText]);

  const shareMessage = useCallback(async () => {
    if (!hasText) return;

    try {
      await Share.share({ message: messageText });
    } catch {
      showError("No se pudo compartir", "Intenta nuevamente.");
    }
  }, [hasText, messageText]);

  if (!hasText) return null;

  const utilityButtonStyle = ({ pressed }: { pressed: boolean }) => ({
    width: 44,
    height: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    opacity: pressed ? 0.55 : 1,
  });

  return (
    <View
      style={{
        flexDirection: "row",
        alignSelf: align === "right" ? "flex-end" : "flex-start",
        alignItems: "center",
        marginHorizontal: -t.spacing.xs,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isCopied ? "Mensaje copiado" : "Copiar mensaje"}
        accessibilityHint="Copia el texto al portapapeles"
        hitSlop={4}
        onPress={() => void copyMessage()}
        style={utilityButtonStyle}
      >
        <Icon
          name={isCopied ? "check" : "copy"}
          size={20}
          color={isCopied ? t.colors.primary : t.colors.stateAnulated}
          strokeWidth={1.8}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compartir mensaje"
        accessibilityHint="Abre las opciones para compartir el texto"
        hitSlop={4}
        onPress={() => void shareMessage()}
        style={utilityButtonStyle}
      >
        <Icon
          name="share-2"
          size={20}
          color={t.colors.stateAnulated}
          strokeWidth={1.8}
        />
      </Pressable>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reintentar mensaje"
          accessibilityHint="Vuelve a enviar este mensaje sin duplicar la solicitud"
          disabled={retryDisabled}
          hitSlop={4}
          onPress={onRetry}
          style={utilityButtonStyle}
        >
          <Icon
            name="send"
            size={20}
            color={t.colors.error}
            strokeWidth={1.8}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
