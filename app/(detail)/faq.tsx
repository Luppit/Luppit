import { Icon } from "@/src/components/Icon";
import GlassSurface from "@/src/components/glass/GlassSurface";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import { FaqListItem, getActiveFaqItems } from "@/src/services/faq.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import {
  Linking,
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

const SUPPORT_EMAIL = "soporte@luppit.com";

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
      <GlassSurface
        variant="surface"
        blur="surface"
        style={s.intro}
        contentStyle={s.introContent}
      >
        <View style={s.introIconBadge}>
          <Icon name="book-open" size={22} color={t.colors.primary} />
        </View>
        <View style={s.introText}>
          <Text variant="subtitle">Preguntas frecuentes</Text>
          <Text color="textMedium">
            Encuentra respuestas rápidas sobre tu cuenta, solicitudes, ofertas y chats.
          </Text>
        </View>
      </GlassSurface>

      <GlassSurface
        variant="surface"
        blur="surface"
        style={s.faqPanel}
        contentStyle={s.faqPanelContent}
      >
        {items.map((item, index) => (
          <FaqAccordionRow
            key={item.id}
            item={item}
            isFirst={index === 0}
            isExpanded={expandedItemId === item.id}
            onToggle={() =>
              setExpandedItemId((current) => (current === item.id ? null : item.id))
            }
          />
        ))}
      </GlassSurface>

      <SupportSection />
    </ScrollView>
  );
}

function SupportSection() {
  const t = useTheme();
  const s = React.useMemo(() => createFaqStyles(t), [t]);

  const openSupportEmail = async () => {
    const subject = encodeURIComponent("Ayuda Luppit");
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;

    try {
      await Linking.openURL(url);
    } catch {
      showError("No se pudo abrir el correo", `Escríbenos a ${SUPPORT_EMAIL}.`);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Enviar correo a soporte"
      onPress={openSupportEmail}
    >
      <GlassSurface
        variant="surface"
        blur="surface"
        style={s.supportCard}
        contentStyle={s.supportContent}
      >
        <View style={s.supportIconBadge}>
          <Icon name="life-buoy" size={22} color={t.colors.primary} />
        </View>
        <View style={s.supportText}>
          <Text variant="subtitle">¿Necesitas más ayuda?</Text>
          <Text color="textMedium">
            Escríbenos a {SUPPORT_EMAIL} y te ayudamos con tu cuenta.
          </Text>
        </View>
      </GlassSurface>
    </Pressable>
  );
}

function FaqAccordionRow({
  item,
  isFirst,
  isExpanded,
  onToggle,
}: {
  item: FaqListItem;
  isFirst: boolean;
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
    <View style={isFirst ? null : s.rowSeparator}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityHint="Muestra u oculta la respuesta."
        onPress={toggleExpanded}
        style={s.questionRow}
      >
        <Text variant="subtitleRegular" style={s.questionText}>
          {item.question}
        </Text>
        <Icon
          name={isExpanded ? "chevron-down" : "chevron-right"}
          size={20}
          color={t.colors.stateAnulated}
        />
      </Pressable>

      {isExpanded ? (
        <View style={s.answerBlock}>
          <Text color="textMedium" style={s.answerText}>
            {item.answer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function createFaqStyles(t: Theme, topContentInset = 0) {
  return StyleSheet.create({
    content: {
      gap: t.spacing.md,
      paddingTop: topContentInset + t.spacing.sm,
      paddingBottom: t.spacing.xl,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingTop: topContentInset,
    },
    intro: {
      borderRadius: t.borders.md,
    },
    introContent: {
      minHeight: 84,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    introIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(131,163,30,0.14)",
    },
    introText: {
      flex: 1,
      gap: t.spacing.xs,
    },
    faqPanel: {
      borderRadius: t.borders.md,
    },
    faqPanelContent: {
      paddingHorizontal: t.spacing.md,
    },
    supportCard: {
      borderRadius: t.borders.md,
    },
    supportContent: {
      minHeight: 84,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    supportIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(131,163,30,0.14)",
    },
    supportText: {
      flex: 1,
      gap: t.spacing.xs,
    },
    rowSeparator: {
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
    },
    questionRow: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingVertical: t.spacing.md,
    },
    questionText: {
      flex: 1,
      minWidth: 0,
      color: t.colors.textDark,
    },
    answerBlock: {
      paddingBottom: t.spacing.md,
      paddingRight: t.spacing.lg,
    },
    answerText: {
      lineHeight: 22,
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
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.backgroudWhite,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    emptyDescription: {
      maxWidth: 300,
      lineHeight: 22,
    },
    retryButton: {
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: t.spacing.md,
    },
  });
}
