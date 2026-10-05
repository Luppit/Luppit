import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import type { PopupSummaryComparison } from "@/src/services/popup.service";
import { type Theme, useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

type ComparisonField = PopupSummaryComparison["fields"][number];

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
  const total = comparison.fields.find((field) => field.id === "total");
  const fields = showFull ? comparison.fields : comparison.fields.filter(
    (field) => field.id !== "total" && field.changed && field.compactVisible !== false
  );

  const renderValues = (field: ComparisonField) => (
    <View style={field.layout === "inline" ? styles.columns : styles.values}>
      {([
        [comparison.currentLabel, field.currentValue],
        [comparison.proposedLabel, field.proposedValue],
      ] as const).map(([label, value], index) => (
        showFull || value ? (
          <View key={label} style={[styles.value, field.layout === "inline" ? styles.columnValue : undefined]}>
            <Text variant="small" color="textMedium">{label}</Text>
            <Text variant="body" style={index === 1 ? styles.proposed : undefined}>
              {value || "—"}
            </Text>
          </View>
        ) : null
      ))}
    </View>
  );

  return (
    <View style={styles.comparison}>
      {!showFull && total ? (
        <View style={styles.total}>
          <Text variant="small" color="textMedium">{total.label}</Text>
          <View style={styles.columns}>
            <View style={[styles.value, styles.columnValue]}>
              <Text variant="small" color="textMedium">{comparison.currentLabel}</Text>
              <Text variant="subtitle">{total.currentValue}</Text>
            </View>
            <View style={[styles.value, styles.columnValue]}>
              <Text variant="small" color="textMedium">{comparison.proposedLabel}</Text>
              <Text variant="subtitle" color="primary">{total.proposedValue}</Text>
            </View>
          </View>
          {comparison.differenceLabel ? (
            <Text variant="body" style={styles.heading}>{comparison.differenceLabel}</Text>
          ) : null}
        </View>
      ) : null}
      {fields.map((field) => {
        const disclosure = !showFull && (field.id === "description" || field.id === "photos");
        return (
          <View key={field.id} style={styles.field}>
            <View style={styles.fieldHeading}>
              <Text variant="body" style={styles.heading}>
                {showFull ? field.label : field.changeLabel || field.label}
              </Text>
              {showFull && field.changed ? (
                <Text variant="small" color="textMedium">{comparison.changedLabel}</Text>
              ) : null}
            </View>
            {disclosure ? (
              <Pressable accessibilityRole="button" onPress={onShowFull}
                accessibilityLabel={field.id === "description" ? "Ver descripción completa" : "Ver fotos"}
                style={styles.disclosure}>
                <Text variant="body" style={styles.disclosureText}>
                  {field.id === "description" ? "Ver descripción completa" : "Ver fotos"}
                </Text>
                <Icon name="chevron-right" size={18} color={theme.colors.textMedium} />
              </Pressable>
            ) : renderValues(field)}
          </View>
        );
      })}
      {!showFull && !comparison.fields.some((field) => field.changed) ? (
        <Text variant="body">No hay cambios en los detalles mostrados.</Text>
      ) : null}
      {!showFull && onShowFull ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Ver ofertas completas"
          onPress={onShowFull} style={styles.details}>
          <Text variant="body" style={[styles.heading, styles.disclosureText]}>Ver ofertas completas</Text>
          <Icon name="chevron-right" size={20} color={theme.colors.textMedium} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    comparison: { gap: t.spacing.sm },
    total: { gap: t.spacing.sm, paddingVertical: t.spacing.sm },
    columns: { flexDirection: "row", gap: t.spacing.md },
    value: { minWidth: 0, gap: t.spacing.xs },
    columnValue: { flex: 1 },
    values: { gap: t.spacing.md },
    field: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.border,
      paddingVertical: t.spacing.sm,
      gap: t.spacing.sm,
    },
    fieldHeading: { gap: t.spacing.xs },
    heading: { fontFamily: t.typography.subtitle.fontFamily },
    proposed: { fontFamily: t.typography.subtitle.fontFamily },
    disclosureText: { flexShrink: 1 },
    disclosure: {
      minHeight: 44, flexDirection: "row", alignItems: "center",
      justifyContent: "space-between", gap: t.spacing.sm,
    },
    details: {
      minHeight: 48, flexDirection: "row", alignItems: "center",
      justifyContent: "space-between", gap: t.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.border,
      paddingVertical: t.spacing.sm,
    },
  });
}
