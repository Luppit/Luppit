import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { Modal, Pressable, View } from "react-native";
import { createHintModalStyles } from "./styles";

type HintModalProps = {
  visible: boolean;
  text: string;
  onClose: () => void;
};

export default function HintModal({ visible, text, onClose }: HintModalProps) {
  const t = useTheme();
  const s = useMemo(() => createHintModalStyles(t), [t]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <View style={s.card}>
          <Text variant="body">{text}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}
