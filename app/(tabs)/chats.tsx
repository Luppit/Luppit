import { Icon } from "@/src/components/Icon";
import LuppitChip from "@/src/components/chip/LuppitChip";
import GlassSurface from "@/src/components/glass/GlassSurface";
import LoadingState from "@/src/components/loading/LoadingState";
import ProfilePicture, {
  type ProfilePictureKind,
} from "@/src/components/profile/ProfilePicture";
import RoleGate from "@/src/components/role/RoleGate";
import StandaloneListEmptyState from "@/src/components/standaloneList/StandaloneListEmptyState";
import { ROUNDED_SURFACE_RADIUS } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  ConversationListFilters,
  ConversationListItem,
  getCurrentProfileConversations,
} from "@/src/services/conversation.service";
import { openPopup } from "@/src/services/popup.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, SectionList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EMPTY_CHAT_FILTERS: ConversationListFilters = {
  searchValue: "",
  startDate: "",
  endDate: "",
  selectedCategoryIds: [],
};

function normalizeFilterList(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

function hasChatFilters(filters: ConversationListFilters) {
  return Boolean(
      filters.searchValue ||
      filters.startDate ||
      filters.endDate ||
      filters.selectedCategoryIds.length > 0
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatLastMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const dayDiff = Math.floor((startOfDay(now) - startOfDay(date)) / 86400000);

  if (dayDiff === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (dayDiff === 1) return "Ayer";

  if (dayDiff > 1 && dayDiff < 7) {
    const weekday = new Intl.DateTimeFormat("es-CR", { weekday: "long" }).format(date);
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }

  return date.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
  });
}

function getMessagePreview(item: ConversationListItem) {
  const text = item.last_message_text?.trim();
  if (text) return text;

  const kind = (item.last_message_kind ?? "").toUpperCase();
  if (kind === "IMAGE") return "Imagen";
  if (kind === "SYSTEM") return "Actualización de la conversación";
  return "Sin mensajes";
}

function formatFilterDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
  });
}

function getSelectedCategoryLabels(
  selectedCategoryIds: string[],
  categoryOptions: { id: string; label: string }[]
) {
  const labelById = new Map(categoryOptions.map((option) => [option.id, option.label]));
  return selectedCategoryIds.map((id) => ({
    id,
    label: labelById.get(id) ?? "Categoría",
  }));
}

type ConversationSection = {
  key: "unread" | "all";
  title: string | null;
  data: ConversationListItem[];
};

function getConversationSections(items: ConversationListItem[]): ConversationSection[] {
  const unreadItems = items.filter((item) => item.has_unopened);
  const remainingItems = items.filter((item) => !item.has_unopened);
  const sections: ConversationSection[] = [];

  if (unreadItems.length > 0) {
    sections.push({
      key: "unread",
      title: `Sin leer · ${unreadItems.length}`,
      data: unreadItems,
    });
  }

  if (remainingItems.length > 0) {
    sections.push({
      key: "all",
      title: unreadItems.length > 0 ? "Recientes" : null,
      data: remainingItems,
    });
  }

  return sections;
}

export default function ChatsScreen() {
  const t = useTheme();
  const s = React.useMemo(() => createChatsScreenStyles(t), [t]);

  return (
    <View style={s.screen}>
      <RoleGate
        loading={
          <>
            <ChatsTopBar title="Chats" />
            <LoadingState label="Cargando contenido..." />
          </>
        }
        buyer={<ChatsContent counterpartKind="business" />}
        seller={<ChatsContent counterpartKind="buyer" />}
      />
    </View>
  );
}

function ChatsContent({
  counterpartKind,
}: {
  counterpartKind: ProfilePictureKind;
}) {
  const t = useTheme();
  const s = React.useMemo(() => createChatsScreenStyles(t, 0, true), [t]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [conversations, setConversations] = React.useState<ConversationListItem[]>([]);
  const [filterOptionsSource, setFilterOptionsSource] = React.useState<
    ConversationListItem[]
  >([]);
  const [filters, setFilters] =
    React.useState<ConversationListFilters>(EMPTY_CHAT_FILTERS);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadFilterOptions = React.useCallback(async () => {
    const result = await getCurrentProfileConversations(EMPTY_CHAT_FILTERS);
    if (!isMountedRef.current || !result.ok) return;
    setFilterOptionsSource(result.data);
  }, []);

  const loadConversations = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const result = await getCurrentProfileConversations(filters);
    if (!isMountedRef.current) return;

    if (result.ok) {
      setConversations(result.data);
    } else {
      setConversations([]);
      setLoadError(result.error.message);
      showError("No se pudieron cargar tus chats", result.error.message);
    }

    setIsLoading(false);
  }, [filters]);

  useFocusEffect(
    React.useCallback(() => {
      void loadFilterOptions();
      void loadConversations();
      return () => {};
    }, [loadConversations, loadFilterOptions])
  );

  React.useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const categoryOptions = React.useMemo(() => {
    const optionsById = new Map<string, { id: string; label: string }>();

    filterOptionsSource.forEach((item) => {
      const id = item.request_category_id?.trim();
      const label = item.request_category_name?.trim();
      if (!id || !label || optionsById.has(id)) return;
      optionsById.set(id, { id, label });
    });

    return Array.from(optionsById.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es")
    );
  }, [filterOptionsSource]);

  const visibleConversations = React.useMemo(() => conversations, [conversations]);
  const conversationSections = React.useMemo(
    () => getConversationSections(visibleConversations),
    [visibleConversations]
  );
  const hasActiveFilters = React.useMemo(() => hasChatFilters(filters), [filters]);
  const selectedCategoryLabels = React.useMemo(
    () => getSelectedCategoryLabels(filters.selectedCategoryIds, categoryOptions),
    [categoryOptions, filters.selectedCategoryIds]
  );

  const openSearchPopup = React.useCallback(() => {
    openPopup({
      type: "filters",
      title: "Filtros",
      searchField: {
        label: "Negocio, solicitud o mensaje",
        placeholder: "Buscar",
        initialValue: filters.searchValue,
      },
      dateRangeField: {
        label: "Último mensaje",
        startPlaceholder: "Desde",
        endPlaceholder: "Hasta",
        initialStartValue: filters.startDate,
        initialEndValue: filters.endDate,
      },
      chipGroups: [
        {
          id: "categories",
          label: "Categoría",
          options: categoryOptions,
          initialSelectedIds: filters.selectedCategoryIds,
        },
      ],
      clearLabel: "Limpiar",
      applyLabel: "Aplicar",
      onClear: () => setFilters(EMPTY_CHAT_FILTERS),
      onApply: (values) => {
        const selectedGroups = values.selectedChipGroupIds ?? {};
        setFilters({
          searchValue: values.searchValue.trim(),
          startDate: values.startDate.trim(),
          endDate: values.endDate.trim(),
          selectedCategoryIds: normalizeFilterList(selectedGroups.categories ?? []),
        });
      },
    });
  }, [categoryOptions, filters]);

  const openConversation = React.useCallback((item: ConversationListItem) => {
    router.push({
      pathname: "/(conversation)/offer",
      params: {
        conversationId: item.conversation_id,
        title: item.request_title || item.display_name || "Conversación",
      },
    });
  }, []);

  const removeSearchFilter = React.useCallback(() => {
    setFilters((current) => ({ ...current, searchValue: "" }));
  }, []);

  const removeStartDateFilter = React.useCallback(() => {
    setFilters((current) => ({ ...current, startDate: "" }));
  }, []);

  const removeEndDateFilter = React.useCallback(() => {
    setFilters((current) => ({ ...current, endDate: "" }));
  }, []);

  const removeCategoryFilter = React.useCallback((categoryId: string) => {
    setFilters((current) => ({
      ...current,
      selectedCategoryIds: current.selectedCategoryIds.filter((id) => id !== categoryId),
    }));
  }, []);

  const retryLoad = React.useCallback(() => {
    void loadConversations();
  }, [loadConversations]);

  const content = (() => {
    if (isLoading) {
      return (
        <View style={s.stateContent}>
          <LoadingState label="Cargando chats..." />
        </View>
      );
    }

    if (visibleConversations.length === 0) {
      return (
        <View style={s.stateContent}>
          <StandaloneListEmptyState
            icon={loadError ? "alert-circle" : hasActiveFilters ? "search" : "message-circle"}
            title={
              loadError
                ? "No se pudieron cargar tus chats"
                : hasActiveFilters
                  ? "No encontramos chats"
                  : "Aún no tienes chats"
            }
            description={
              loadError
                ? loadError
                : hasActiveFilters
                  ? "Prueba cambiando la búsqueda o limpiando los filtros."
                  : "Cuando tengas conversaciones activas, aparecerán aquí."
            }
            actionLabel={loadError ? "Reintentar" : hasActiveFilters ? "Limpiar filtros" : null}
            actionIcon={loadError ? undefined : hasActiveFilters ? "x" : undefined}
            onAction={loadError ? retryLoad : hasActiveFilters ? () => setFilters(EMPTY_CHAT_FILTERS) : undefined}
          />
        </View>
      );
    }

    return (
      <SectionList
        sections={conversationSections}
        keyExtractor={(item) => item.conversation_id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.chatList}
        ListHeaderComponent={
          hasActiveFilters ? (
            <View style={s.activeChipsRow}>
              {filters.searchValue ? (
                <LuppitChip
                  icon="search"
                  label={`Buscar: ${filters.searchValue}`}
                  onRemove={removeSearchFilter}
                  removeAccessibilityLabel="Quitar búsqueda"
                />
              ) : null}

              {filters.startDate ? (
                <LuppitChip
                  icon="sliders-horizontal"
                  label={`Desde ${formatFilterDate(filters.startDate)}`}
                  onRemove={removeStartDateFilter}
                  removeAccessibilityLabel="Quitar fecha inicial"
                />
              ) : null}

              {filters.endDate ? (
                <LuppitChip
                  icon="sliders-horizontal"
                  label={`Hasta ${formatFilterDate(filters.endDate)}`}
                  onRemove={removeEndDateFilter}
                  removeAccessibilityLabel="Quitar fecha final"
                />
              ) : null}

              {selectedCategoryLabels.map((category) => (
                <LuppitChip
                  key={category.id}
                  icon="tag"
                  label={category.label}
                  onRemove={() => removeCategoryFilter(category.id)}
                  removeAccessibilityLabel={`Quitar categoría ${category.label}`}
                />
              ))}

              <LuppitChip
                label="Limpiar"
                onPress={() => setFilters(EMPTY_CHAT_FILTERS)}
                accessibilityLabel="Limpiar filtros"
              />
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View accessible accessibilityRole="header" style={s.sectionHeader}>
              <Text variant="small" color="textMedium" style={s.sectionTitle}>
                {section.title}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item, index, section }) => (
          <ChatListRow
            item={item}
            counterpartKind={counterpartKind}
            isFirst={index === 0}
            isLast={index === section.data.length - 1}
            showSeparator={index < section.data.length - 1}
            onPress={() => openConversation(item)}
          />
        )}
      />
    );
  })();

  const toolbar = (
    <View style={s.toolbar}>
      <Pressable
        style={s.searchTrigger}
        onPress={openSearchPopup}
        accessibilityRole="button"
        accessibilityLabel={
          hasActiveFilters ? "Editar filtros aplicados" : "Buscar y filtrar chats"
        }
      >
        <Icon name="search" size={20} color={t.colors.stateAnulated} />
        <Text variant="body" color="stateAnulated" style={s.searchTriggerText}>
          {hasActiveFilters ? "Filtros aplicados" : "Buscar"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <View style={s.content}>
        {content}
      </View>
      <ChatsTopBar title="Chats" accessory={toolbar} />
    </>
  );
}

function ChatListRow({
  item,
  counterpartKind,
  isFirst,
  isLast,
  showSeparator,
  onPress,
}: {
  item: ConversationListItem;
  counterpartKind: ProfilePictureKind;
  isFirst: boolean;
  isLast: boolean;
  showSeparator: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = React.useMemo(() => createChatsScreenStyles(t), [t]);
  const preview = getMessagePreview(item);
  const counterpartName = item.display_name || "Contacto";
  const requestTitle =
    item.request_title?.trim() || item.request_category_name?.trim() || "Conversación";
  const statusLabel = item.status_label?.trim() || "";
  const timeLabel = formatLastMessageTime(item.last_message_at);
  const accessibilityLabel = [
    item.has_unopened
      ? item.unopened_count === 1
        ? "1 mensaje sin leer"
        : `${item.unopened_count} mensajes sin leer`
      : null,
    requestTitle,
    `Con ${counterpartName}`,
    statusLabel ? `Estado: ${statusLabel}` : null,
    preview,
    timeLabel,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <Pressable
      style={({ pressed }) => [
        s.chatRow,
        isFirst ? s.chatRowFirst : null,
        isLast ? s.chatRowLast : null,
        pressed ? s.chatRowPressed : null,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Abre la conversación"
    >
      <View style={s.avatarShell}>
        <ProfilePicture
          kind={counterpartKind}
          name={counterpartName}
          imagePath={item.counterpart_image_path}
          size={52}
          accessible={false}
        />
        {item.has_unopened ? (
          <View style={s.unreadBadge}>
            <Text variant="small" style={s.unreadBadgeText}>
              {item.unopened_count > 99 ? "99+" : item.unopened_count}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={s.chatBody}>
        <View style={s.chatTitleRow}>
          <Text
            variant="body"
            maxLines={2}
            style={[s.chatRequestTitle, item.has_unopened ? s.chatRequestTitleUnread : null]}
          >
            {requestTitle}
          </Text>
          <Text variant="small" color="stateAnulated" maxLines={1} style={s.chatTime}>
            {timeLabel}
          </Text>
        </View>
        <Text variant="small" color="textMedium" maxLines={1}>
          {counterpartName}
        </Text>

        {statusLabel ? (
          <View style={s.chatStatusRow}>
            <Text variant="small" color="stateAnulated" maxLines={1}>
              Estado
            </Text>
            <Text variant="small" color="textMedium" maxLines={1} style={s.chatStatus}>
              {statusLabel}
            </Text>
          </View>
        ) : null}
        <Text
          variant="small"
          color="stateAnulated"
          maxLines={1}
          style={[s.chatPreview, item.has_unopened ? s.chatPreviewUnread : null]}
        >
          {preview}
        </Text>
      </View>

      {showSeparator ? <View style={s.chatRowSeparator} /> : null}
    </Pressable>
  );
}

function ChatsTopBar({
  title,
  accessory,
}: {
  title: string;
  accessory?: React.ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = React.useMemo(
    () => createChatsScreenStyles(t, insets.top, Boolean(accessory)),
    [accessory, insets.top, t]
  );

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  }, []);

  return (
    <GlassSurface
      variant="chrome"
      blur="chrome"
      style={s.topBar}
      clipStyle={s.topBarClip}
      contentStyle={s.topBarContent}
    >
      <View style={s.topBarTitleRow}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={s.topBarSide}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Icon name="arrow-left" size={28} color={t.colors.textDark} />
        </Pressable>

        <Text
          accessibilityRole="header"
          variant="subtitle"
          align="center"
          maxLines={1}
          style={s.topBarTitle}
        >
          {title}
        </Text>

        <View style={s.topBarSide} />
      </View>

      {accessory ? <View style={s.topBarAccessory}>{accessory}</View> : null}
    </GlassSurface>
  );
}

function createChatsScreenStyles(t: Theme, topInset = 0, hasTopBarAccessory = false) {
  const topOffset = topInset + t.spacing.md;
  const topBarVisibleHeight = hasTopBarAccessory ? 128 : 72;
  const topBarHeight = topOffset + (hasTopBarAccessory ? 128 : 72);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    topBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      elevation: Platform.OS === "android" ? 4 : 10,
      height: topBarHeight,
      marginHorizontal: -t.spacing.md,
      marginTop: -topOffset,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: t.glass.radius.chrome,
      borderBottomRightRadius: t.glass.radius.chrome,
    },
    topBarClip: {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: t.glass.radius.chrome,
      borderBottomRightRadius: t.glass.radius.chrome,
      overflow: "hidden",
    },
    topBarContent: {
      flex: 1,
      paddingTop: topOffset,
      paddingHorizontal: t.spacing.xl,
      paddingBottom: t.spacing.md,
    },
    topBarTitleRow: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    topBarSide: {
      width: 40,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    topBarTitle: {
      flex: 1,
    },
    topBarAccessory: {
      height: 48,
      marginTop: t.spacing.sm,
    },
    content: {
      flex: 1,
      gap: t.spacing.md,
    },
    stateContent: {
      flex: 1,
      paddingTop: topBarVisibleHeight + t.spacing.md,
      paddingHorizontal: t.spacing.lg,
      justifyContent: "center",
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    searchTrigger: {
      flex: 1,
      minHeight: 48,
      borderRadius: 999,
      ...t.glass.headerControl,
      paddingHorizontal: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    searchTriggerText: {
      flex: 1,
    },
    activeChipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      paddingBottom: t.spacing.sm,
    },
    chatList: {
      paddingTop: topBarVisibleHeight + t.spacing.md,
      paddingBottom: 112,
    },
    sectionHeader: {
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing.sm,
      backgroundColor: t.colors.background,
    },
    sectionTitle: {
      fontFamily: t.typography.subtitle.fontFamily,
    },
    chatRow: {
      position: "relative",
      minHeight: 116,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.spacing.md,
      marginHorizontal: t.spacing.md,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
      backgroundColor: t.colors.backgroudWhite,
    },
    chatRowFirst: {
      borderTopLeftRadius: ROUNDED_SURFACE_RADIUS,
      borderTopRightRadius: ROUNDED_SURFACE_RADIUS,
    },
    chatRowLast: {
      borderBottomLeftRadius: ROUNDED_SURFACE_RADIUS,
      borderBottomRightRadius: ROUNDED_SURFACE_RADIUS,
    },
    chatRowPressed: {
      backgroundColor: t.colors.primaryLight,
    },
    avatarShell: {
      width: 52,
      height: 52,
      position: "relative",
      marginTop: t.spacing.xs,
    },
    unreadBadge: {
      position: "absolute",
      right: -5,
      bottom: -4,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primary,
      borderWidth: 2,
      borderColor: t.colors.background,
    },
    unreadBadgeText: {
      color: t.colors.backgroudWhite,
      fontSize: 10,
      lineHeight: 12,
    },
    chatBody: {
      flex: 1,
      minWidth: 0,
      gap: t.spacing.xs,
    },
    chatTitleRow: {
      minWidth: 0,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.spacing.sm,
    },
    chatRequestTitle: {
      flex: 1,
      minWidth: 0,
      color: t.colors.textDark,
    },
    chatRequestTitleUnread: {
      fontFamily: t.typography.subtitle.fontFamily,
    },
    chatStatus: {
      flex: 1,
      minWidth: 0,
    },
    chatStatusRow: {
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },
    chatPreview: {
      minWidth: 0,
      flexShrink: 1,
    },
    chatPreviewUnread: {
      color: t.colors.textMedium,
    },
    chatTime: {
      maxWidth: 72,
      flexShrink: 1,
      textAlign: "right",
      paddingTop: 2,
    },
    chatRowSeparator: {
      position: "absolute",
      left: t.spacing.md + 52 + t.spacing.md,
      right: t.spacing.md,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.colors.border,
    },
  });
}
