import { Text } from "@/src/components/Text";
import type { PopupSummaryComparison } from "@/src/services/popup.service";
import { type Theme, useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

type ComparisonField = PopupSummaryComparison["fields"][number];

export function getDescriptionChange(current: string, proposed: string) {
  let start = 0;
  while (start < current.length && start < proposed.length && current[start] === proposed[start]) {
    start += 1;
  }

  let end = 0;
  while (end < current.length - start && end < proposed.length - start &&
    current[current.length - end - 1] === proposed[proposed.length - end - 1]) {
    end += 1;
  }

  const rawRemoved = current.slice(start, current.length - end);
  const rawAdded = proposed.slice(start, proposed.length - end);
  const removed = rawRemoved.trim();
  const added = rawAdded.trim();
  const word = /[A-Za-zÀ-ÿ0-9]/;
  const startsInsideWord = start > 0 && word.test(current[start - 1]) &&
    (word.test(rawRemoved[0] ?? "") || word.test(rawAdded[0] ?? ""));
  const endsInsideWord = end > 0 && word.test(current[current.length - end]) &&
    (word.test(rawRemoved.at(-1) ?? "") || word.test(rawAdded.at(-1) ?? ""));

  if (startsInsideWord || endsInsideWord || (!removed && !added)) {
    return { label: "Texto actualizado", current, proposed };
  }
  if (!removed) return { label: "Se añadió", proposed: added };
  if (!added) return { label: "Se quitó", current: removed };
  return { label: "Se reemplazó", current: removed, proposed: added };
}

export default function SummaryComparison({
  comparison,
  showFull = false,
  onShowFull,
}: {
  comparison: PopupSummaryComparison;
  showFull?: boolean;
  onShowFull?: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (showFull) {
    return (
      <View style={styles.full}>
        {([
          [comparison.currentLabel, "currentValue"],
          [comparison.proposedLabel, "proposedValue"],
        ] as const).map(([title, valueKey]) => (
          <View key={valueKey} style={styles.offer}>
            <Text variant="subtitle">{`Oferta ${title.toLowerCase()}`}</Text>
            {comparison.fields.map((field) => (
              <View key={field.id} style={styles.fullField} accessible
                accessibilityLabel={`${field.label}: ${field[valueKey]}`}>
                <Text variant="small" color="textMedium">{field.label}</Text>
                <Text variant="body">{field[valueKey]}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  const changedFields = comparison.fields.filter((field) => field.changed).filter((field) => {
    if (field.id !== "price") return true;
    const total = comparison.fields.find((candidate) => candidate.id === "total");
    return !total?.changed || !field.currentValue.endsWith(" en total") ||
      !field.proposedValue.endsWith(" en total");
  });

  return (
    <View>
      {changedFields.length === 0 ? (
        <Text variant="body">No hay cambios en los detalles mostrados.</Text>
      ) : changedFields.map((field) => (
        <View key={field.id} style={styles.change} accessible
          accessibilityLabel={getChangedFieldAccessibilityLabel(field)}>
          <Text variant="body" style={styles.heading}>{field.label}</Text>
          {field.id === "description" ? (
            <DescriptionChange field={field} styles={styles} />
          ) : field.id === "photos" && field.currentValue === field.proposedValue ? (
            <Text variant="body">Las fotos cambiaron.</Text>
          ) : (
            <View style={styles.values}>
              <Text variant="small" color="textMedium">{`${comparison.currentLabel}: ${field.currentValue}`}</Text>
              <Text variant="body">{`${comparison.proposedLabel}: ${field.proposedValue}`}</Text>
            </View>
          )}
        </View>
      ))}
      {onShowFull ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Ver ofertas completas"
          onPress={onShowFull} style={styles.detailsLink} hitSlop={8}>
          <Text variant="body" style={styles.linkText}>Ver ofertas completas</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DescriptionChange({ field, styles }: {
  field: ComparisonField;
  styles: ReturnType<typeof createStyles>;
}) {
  const change = getDescriptionChange(field.currentValue, field.proposedValue);
  return (
    <View style={styles.values}>
      <Text variant="small" color="textMedium">{change.label}</Text>
      {change.current !== undefined ? (
        <Text variant="body">{change.label === "Texto actualizado" ? `Actual: ${change.current}` : change.current}</Text>
      ) : null}
      {change.proposed !== undefined ? (
        <Text variant="body">{change.label === "Texto actualizado" ? `Propuesta: ${change.proposed}` : change.proposed}</Text>
      ) : null}
    </View>
  );
}

function getChangedFieldAccessibilityLabel(field: ComparisonField) {
  if (field.id !== "description") {
    if (field.id === "photos" && field.currentValue === field.proposedValue) {
      return `${field.label}. Las fotos cambiaron. Actual: ${field.currentValue}. Propuesta: ${field.proposedValue}`;
    }
    return `${field.label}. Actual: ${field.currentValue}. Propuesta: ${field.proposedValue}`;
  }
  const change = getDescriptionChange(field.currentValue, field.proposedValue);
  return [field.label, change.label, change.current, change.proposed].filter(Boolean).join(". ");
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    change: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.border,
      paddingVertical: t.spacing.md,
      gap: t.spacing.sm,
    },
    heading: { fontFamily: t.typography.subtitle.fontFamily },
    values: { gap: t.spacing.xs },
    detailsLink: { alignSelf: "flex-start", paddingVertical: t.spacing.md },
    linkText: { textDecorationLine: "underline" },
    full: { gap: t.spacing.lg },
    offer: { gap: t.spacing.sm },
    fullField: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.border,
      paddingVertical: t.spacing.sm,
      gap: t.spacing.xs,
    },
  });
}
