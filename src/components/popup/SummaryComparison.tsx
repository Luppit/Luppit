import { Text } from "@/src/components/Text";
import type { PopupSummaryComparison } from "@/src/services/popup.service";
import { type Theme, useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

export default function SummaryComparison({ comparison }: { comparison: PopupSummaryComparison }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 380 || fontScale > 1.15;

  return (
    <View>
      {!compact && comparison.fields.some((field) => field.layout === "inline") ? (
        <View style={styles.columns} accessible={false}>
          <View style={styles.labelColumn} />
          <Text variant="small" color="textMedium" style={styles.valueColumn}>{comparison.currentLabel}</Text>
          <Text variant="small" color="textMedium" style={styles.valueColumn}>{comparison.proposedLabel}</Text>
        </View>
      ) : null}
      {comparison.fields.map((field) => {
        const stacked = compact || field.layout === "stacked";
        return (
          <View
            key={field.id}
            style={styles.field}
            accessible
            accessibilityLabel={[
              field.label,
              field.changed ? comparison.changedLabel : null,
              `${comparison.currentLabel}: ${field.currentValue}`,
              `${comparison.proposedLabel}: ${field.proposedValue}`,
            ].filter(Boolean).join(". ")}
          >
            {stacked ? (
              <>
                <View style={styles.fieldHeading}>
                  <Text style={styles.medium}>{field.label}</Text>
                  {field.changed ? <Text variant="small" color="textMedium">{comparison.changedLabel}</Text> : null}
                </View>
                <View style={styles.textValue}>
                  <Text variant="small" color="textMedium">{comparison.currentLabel}</Text>
                  <Text>{field.currentValue}</Text>
                </View>
                <View style={[styles.textValue, field.changed && styles.changed]}>
                  <Text variant="small" color="textMedium">{comparison.proposedLabel}</Text>
                  <Text>{field.proposedValue}</Text>
                </View>
              </>
            ) : (
              <View style={styles.columns}>
                <Text variant="small" style={styles.labelColumn}>{field.label}</Text>
                <Text variant="small" style={styles.valueColumn}>{field.currentValue}</Text>
                <View style={[styles.valueColumn, styles.inlineValue, field.changed && styles.changed]}>
                  <Text variant="small">{field.proposedValue}</Text>
                  {field.changed ? <Text variant="small" color="textMedium">{comparison.changedLabel}</Text> : null}
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    columns: { flexDirection: "row", alignItems: "flex-start", gap: t.spacing.sm },
    labelColumn: { flex: 0.9 },
    valueColumn: { flex: 1, minWidth: 0 },
    field: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.border,
      marginTop: t.spacing.sm,
      paddingVertical: t.spacing.sm,
      gap: t.spacing.sm,
    },
    fieldHeading: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.spacing.sm },
    medium: { fontFamily: t.typography.subtitle.fontFamily },
    textValue: { padding: t.spacing.sm, gap: t.spacing.xs },
    inlineValue: { gap: t.spacing.xs },
    changed: { backgroundColor: t.colors.primaryLight, borderRadius: t.borders.sm },
  });
}
