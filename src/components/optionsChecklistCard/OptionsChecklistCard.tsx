import { Icon } from "@/src/components/Icon";
import HintModal from "@/src/components/hintModal/HintModal";
import { Text } from "@/src/components/Text";
import { LucideIconName } from "@/src/icons/lucide";
import { useTheme } from "@/src/themes";
import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { createOptionsChecklistCardStyles } from "./styles";

export type ChecklistOption = {
  id: string;
  label: string;
  hint?: string;
  content?: React.ReactNode;
  disabled?: boolean;
};

type OptionsChecklistCardProps = {
  icon: LucideIconName;
  title: string;
  description: string;
  options: ChecklistOption[];
  allowMultiple?: boolean;
  value?: string[];
  defaultValue?: string[];
  onChange?: (selectedIds: string[]) => void;
};

export default function OptionsChecklistCard({
  icon,
  title,
  description,
  options,
  allowMultiple = true,
  value,
  defaultValue = [],
  onChange,
}: OptionsChecklistCardProps) {
  const t = useTheme();
  const s = useMemo(() => createOptionsChecklistCardStyles(t), [t]);
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue);
  const [visibleHint, setVisibleHint] = useState<string | null>(null);

  const selected = value ?? internalValue;

  const updateSelected = (next: string[]) => {
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
  };

  const toggleOption = (id: string) => {
    const isSelected = selected.includes(id);
    if (isSelected) {
      updateSelected(selected.filter((item) => item !== id));
      return;
    }

    if (allowMultiple) {
      updateSelected([...selected, id]);
      return;
    }

    updateSelected([id]);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerIconWrap}>
          <Icon name={icon} size={22} color={t.colors.textDark} />
        </View>
        <View style={s.headerTextBlock}>
          <Text variant="body">{title}</Text>
          <Text variant="caption">{description}</Text>
        </View>
      </View>

      {options.map((option, index) => {
        const isSelected = selected.includes(option.id);
        const hasExpandableContent = Boolean(option.content);

        return (
          <View key={option.id} style={[s.row, index > 0 ? s.separator : null]}>
            <Pressable
              style={s.rowPressable}
              disabled={option.disabled}
              onPress={() => toggleOption(option.id)}
            >
              <View style={[s.checkbox, isSelected ? s.checkboxChecked : null]}>
                {isSelected ? (
                  <Icon
                    name="check"
                    size={16}
                    color={t.colors.backgroudWhite}
                  />
                ) : null}
              </View>

              <View style={s.labelRow}>
                <Text variant="body" style={s.label}>
                  {option.label}
                </Text>

                {option.hint ? (
                  <Pressable
                    style={s.hintButton}
                    onPress={() => setVisibleHint(option.hint ?? null)}
                    hitSlop={8}
                  >
                    <Icon name="info" size={16} color={t.colors.primary} />
                  </Pressable>
                ) : null}
              </View>
            </Pressable>

            {isSelected && hasExpandableContent ? (
              <View style={s.expandedContent}>{option.content}</View>
            ) : null}
          </View>
        );
      })}

      <HintModal
        visible={visibleHint != null}
        text={visibleHint ?? ""}
        onClose={() => setVisibleHint(null)}
      />
    </View>
  );
}
