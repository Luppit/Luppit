import { Icon } from "@/src/components/Icon";
import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import {
  createRoundedSurfaceStyle,
  ROUNDED_SURFACE_RADIUS,
} from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import { SUPPORT_EMAIL } from "@/src/config/appInfo";
import { FaqListItem, getActiveFaqItems } from "@/src/services/faq.service";
import { openSupportEmail } from "@/src/services/support.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function FaqScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = React.useMemo(() => createFaqStyles(t, topContentInset), [t, topContentInset]);
  const [items, setItems] = React.useState<FaqListItem[]>([]);
  const [expandedItemId, setExpandedItemId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadFaqItems = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const result = await getActiveFaqItems();
    if (!isMountedRef.current) return;

    if (!result.ok) {
      setItems([]);
      setLoadError(result.error.message);
      setIsLoading(false);
      showError("No se pudo cargar la ayuda", result.error.message);
      return;
    }

    setItems(result.data);
    setExpandedItemId(null);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadFaqItems();
      return () => {};
    }, [loadFaqItems])
  );

  if (isLoading) {
    return <LoadingState label="Cargando ayuda..." style={s.loadingBox} />;
  }

  if (loadError) {
    return (
      <View style={s.centerState}>
        <View style={s.emptyIconBadge}>
          <Icon name="help-circle" size={28} color={t.colors.stateAnulated} />
        </View>
        <Text variant="subtitle" align="center">
          No se pudo cargar la ayuda.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadFaqItems()}
          style={s.retryButton}
        >
          <Text color="primary">Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={s.centerState}>
        <View style={s.emptyIconBadge}>
          <Icon name="help-circle" size={28} color={t.colors.textDark} />
        </View>
        <Text variant="subtitle" align="center">
          Sin preguntas frecuentes
        </Text>
        <Text color="textMedium" align="center" style={s.emptyDescription}>
          Cuando tengamos contenido de ayuda disponible, aparecerá aquí.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <GroupedListSection title="Preguntas frecuentes">
        {items.map((item, index) => (
          <FaqAccordionRow
            key={item.id}
            item={item}
            isLast={index === items.length - 1}
            isExpanded={expandedItemId === item.id}
            onToggle={() =>
              setExpandedItemId((current) => (current === item.id ? null : item.id))
            }
          />
        ))}
      </GroupedListSection>

      <SupportSection />
    </ScrollView>
  );
}

function SupportSection() {
  return (
    <GroupedListSection title="Soporte">
      <GroupedListRow
        icon="life-buoy"
        label="Contactar soporte"
        description={`Escríbenos a ${SUPPORT_EMAIL}.`}
        showSeparator={false}
        accessibilityLabel="Enviar correo a soporte"
        onPress={openSupportEmail}
      />
    </GroupedListSection>
  );
}

function FaqAccordionRow({
  item,
  isLast,
  isExpanded,
  onToggle,
}: {
  item: FaqListItem;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const t = useTheme();
  const s = React.useMemo(() => createFaqStyles(t), [t]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityHint="Muestra u oculta la respuesta."
        onPress={toggleExpanded}
        style={s.questionRow}
      >
        <Text variant="body" style={s.questionText}>
          {item.question}
        </Text>
        <Icon
          name={isExpanded ? "chevron-down" : "chevron-right"}
          size={18}
          color={t.colors.stateAnulated}
        />
      </Pressable>

      {isExpanded ? (
        <View style={s.answerBlock}>
          <Text variant="body" color="textMedium" style={s.answerText}>
            {item.answer}
          </Text>
        </View>
      ) : null}
      {!isLast ? <View style={s.rowInsetSeparator} /> : null}
    </View>
  );
}

function createFaqStyles(t: Theme, topContentInset = 0) {
  return StyleSheet.create({
    content: {
      gap: t.spacing.lg,
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
    questionRow: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
    },
    questionText: {
      flex: 1,
      minWidth: 0,
      color: t.colors.textDark,
    },
    answerBlock: {
      paddingTop: t.spacing.xs,
      paddingBottom: t.spacing.lg,
      paddingHorizontal: t.spacing.md,
    },
    answerText: {
      flexShrink: 1,
      color: t.colors.textMedium,
    },
    rowInsetSeparator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: t.spacing.md,
      backgroundColor: "rgba(0,0,0,0.08)",
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
