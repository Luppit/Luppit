import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import {
  createRoundedSurfaceStyle,
  ROUNDED_SURFACE_RADIUS,
} from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  getActiveLegalDocument,
  LegalDocument,
  LEGAL_DOCUMENT_CODES,
} from "@/src/services/legal-document.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function formatEffectiveDate(value: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function LegalDocumentScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = React.useMemo(
    () => createLegalDocumentStyles(t, topContentInset),
    [t, topContentInset]
  );
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const documentCode =
    getParamValue(params.code)?.trim() || LEGAL_DOCUMENT_CODES.termsConditions;
  const [document, setDocument] = React.useState<LegalDocument | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDocument = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const result = await getActiveLegalDocument(documentCode);
    if (!isMountedRef.current) return;

    if (!result.ok) {
      setDocument(null);
      setLoadError(result.error.message);
      setIsLoading(false);
      showError("No se pudo cargar el documento", result.error.message);
      return;
    }

    setDocument(result.data);
    setIsLoading(false);
  }, [documentCode]);

  useFocusEffect(
    React.useCallback(() => {
      void loadDocument();
      return () => {};
    }, [loadDocument])
  );

  if (isLoading) {
    return <LoadingState label="Cargando documento..." style={s.loadingBox} />;
  }

  if (loadError) {
    return (
      <View style={s.centerState}>
        <View style={s.emptyIconBadge}>
          <Icon name="file-text" size={28} color={t.colors.stateAnulated} />
        </View>
        <Text variant="subtitle" align="center">
          No se pudo cargar el documento.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadDocument()}
          style={s.retryButton}
        >
          <Text color="primary">Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (!document || document.sections.length === 0) {
    return (
      <View style={s.centerState}>
        <View style={s.emptyIconBadge}>
          <Icon name="file-text" size={28} color={t.colors.textDark} />
        </View>
        <Text variant="subtitle" align="center">
          Contenido no disponible
        </Text>
        <Text color="textMedium" align="center" style={s.emptyDescription}>
          Cuando el documento legal esté publicado, aparecerá aquí.
        </Text>
      </View>
    );
  }

  const effectiveDate = formatEffectiveDate(document.effectiveDate);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      {document.versionLabel || effectiveDate ? (
        <View style={s.metadataBlock}>
          {document.versionLabel ? (
            <Text variant="small" color="textMedium">
              {document.versionLabel}
            </Text>
          ) : null}
          {effectiveDate ? (
            <Text variant="small" color="textMedium">
              Vigente desde {effectiveDate}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={s.documentSurface}>
        {document.sections.map((section, index) => (
          <View
            key={section.id}
            style={[
              s.sectionBlock,
              index > 0 ? s.sectionBlockWithSeparator : null,
            ]}
          >
            {section.heading ? (
              <Text variant="body" style={s.sectionHeading}>
                {section.heading}
              </Text>
            ) : null}
            <Text variant="body" color="textMedium" style={s.sectionBody}>
              {section.body}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function createLegalDocumentStyles(t: Theme, topContentInset = 0) {
  return StyleSheet.create({
    content: {
      gap: t.spacing.md,
      paddingTop: topContentInset + t.spacing.md,
      paddingBottom: t.spacing.xl,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingTop: topContentInset,
    },
    metadataBlock: {
      gap: t.spacing.xs,
      paddingHorizontal: t.spacing.md,
    },
    documentSurface: {
      gap: t.spacing.lg,
      padding: t.spacing.md,
      ...createRoundedSurfaceStyle(t),
    },
    sectionBlock: {
      gap: t.spacing.sm,
    },
    sectionBlockWithSeparator: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.border,
      paddingTop: t.spacing.lg,
    },
    sectionHeading: {
      color: t.colors.textDark,
      fontFamily: t.typography.subtitle.fontFamily,
    },
    sectionBody: {
      color: t.colors.textMedium,
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingTop: topContentInset,
      paddingHorizontal: t.spacing.lg,
    },
    emptyIconBadge: {
      width: 56,
      height: 56,
      borderRadius: ROUNDED_SURFACE_RADIUS,
      alignItems: "center",
      justifyContent: "center",
      ...createRoundedSurfaceStyle(t),
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    emptyDescription: {
      maxWidth: 300,
    },
    retryButton: {
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: t.spacing.md,
    },
  });
}
