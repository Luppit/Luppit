import { Icon } from "@/src/components/Icon";
import GlassSurface from "@/src/components/glass/GlassSurface";
import LoadingState from "@/src/components/loading/LoadingState";
import RoleGate from "@/src/components/role/RoleGate";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
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
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
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

function getInitial(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
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
        buyer={<ChatsContent />}
        seller={<ChatsContent />}
      />
    </View>
  );
}

function ChatsContent() {
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

  const visibleConversations = React.useMemo(
    () => conversations,
    [conversations]
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
          <EmptyChatsState
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.chatList}
      >
        {hasActiveFilters ? (
          <View style={s.activeChipsRow}>
            {filters.searchValue ? (
              <FilterChip
                icon="search"
                label={`Buscar: ${filters.searchValue}`}
                accessibilityLabel="Quitar búsqueda"
                onRemove={removeSearchFilter}
              />
            ) : null}

            {filters.startDate ? (
              <FilterChip
                icon="sliders-horizontal"
                label={`Desde ${formatFilterDate(filters.startDate)}`}
                accessibilityLabel="Quitar fecha inicial"
                onRemove={removeStartDateFilter}
              />
            ) : null}

            {filters.endDate ? (
              <FilterChip
                icon="sliders-horizontal"
                label={`Hasta ${formatFilterDate(filters.endDate)}`}
                accessibilityLabel="Quitar fecha final"
                onRemove={removeEndDateFilter}
              />
            ) : null}

            {selectedCategoryLabels.map((category) => (
              <FilterChip
                key={category.id}
                icon="tag"
                label={category.label}
                accessibilityLabel={`Quitar categoría ${category.label}`}
                onRemove={() => removeCategoryFilter(category.id)}
              />
            ))}

            <Pressable
              style={s.clearFiltersChip}
              onPress={() => setFilters(EMPTY_CHAT_FILTERS)}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros"
            >
              <Text variant="body" style={s.clearFiltersLabel}>
                Limpiar
              </Text>
            </Pressable>
          </View>
        ) : null}

        {visibleConversations.map((item, index) => (
          <ChatListRow
            key={item.conversation_id}
            item={item}
            showSeparator={index < visibleConversations.length - 1}
            onPress={() => openConversation(item)}
          />
        ))}
      </ScrollView>
    );
  })();

  const toolbar = (
      <View style={s.toolbar}>
        <Pressable
          style={s.searchTrigger}
          onPress={openSearchPopup}
          accessibilityRole="button"
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

function FilterChip({
  icon,
  label,
  accessibilityLabel,
  onRemove,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  accessibilityLabel: string;
  onRemove: () => void;
}) {
  const t = useTheme();
  const s = React.useMemo(() => createChatsScreenStyles(t), [t]);

  return (
    <View style={s.activeChip}>
      <Icon name={icon} size={16} color={t.colors.textDark} />
      <Text variant="body" style={s.activeChipLabel} maxLines={1}>
        {label}
      </Text>
      <Pressable
        style={s.activeChipClose}
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Icon name="x" size={16} color={t.colors.textDark} />
      </Pressable>
    </View>
  );
}

function ChatListRow({
  item,
  showSeparator,
  onPress,
}: {
  item: ConversationListItem;
  showSeparator: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = React.useMemo(() => createChatsScreenStyles(t), [t]);
  const preview = getMessagePreview(item);
  const title = item.display_name || "Conversación";
  const contextLabel = item.request_title?.trim() || item.request_category_name?.trim() || "";

  return (
    <Pressable
      style={({ pressed }) => [s.chatRow, pressed && s.chatRowPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={s.avatar}>
        <Text variant="subtitle" style={s.avatarText}>
          {getInitial(title)}
        </Text>
        {item.has_unopened ? <View style={s.unreadMarker} /> : null}
      </View>

      <View style={s.chatBody}>
        <Text
          variant="body"
          maxLines={1}
          style={[s.chatName, item.has_unopened ? s.chatNameUnread : null]}
        >
          {title}
        </Text>
        {contextLabel ? (
          <Text variant="body" color="textMedium" maxLines={1} style={s.chatContext}>
            {contextLabel}
          </Text>
        ) : null}
        <Text
          variant="body"
          color="stateAnulated"
          maxLines={1}
          style={[s.chatPreview, item.has_unopened ? s.chatPreviewUnread : null]}
        >
          {preview}
        </Text>
      </View>

      <View style={s.chatMeta}>
        <Text variant="body" color="stateAnulated" maxLines={1} style={s.chatTime}>
          {formatLastMessageTime(item.last_message_at)}
        </Text>
        <Icon name="chevron-right" size={18} color={t.colors.stateAnulated} />
      </View>
      {showSeparator ? <View style={s.chatRowSeparator} /> : null}
    </Pressable>
  );
}

function EmptyChatsState({
  icon,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  description: string;
  actionLabel: string | null;
  actionIcon?: React.ComponentProps<typeof Icon>["name"];
  onAction?: () => void;
}) {
  const t = useTheme();
  const s = React.useMemo(() => createChatsScreenStyles(t), [t]);

  return (
    <View style={s.emptyState}>
      <View style={s.emptyIconBadge}>
        <Icon name={icon} size={24} color={t.colors.primary} />
      </View>
      <Text variant="body" style={s.emptyTitle} align="center">
        {title}
      </Text>
      <Text variant="small" color="stateAnulated" align="center" style={s.emptyDescription}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          style={s.emptyAction}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          {actionIcon ? <Icon name={actionIcon} size={16} color={t.colors.textDark} /> : null}
          <Text variant="body" style={s.emptyActionLabel}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
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
        <Pressable onPress={goBack} hitSlop={12} style={s.topBarSide}>
          <Icon name="arrow-left" size={28} color={t.colors.textDark} />
        </Pressable>

        <Text variant="subtitle" align="center" maxLines={1} style={s.topBarTitle}>
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
    },
    activeChip: {
      maxWidth: "100%",
      minHeight: 36,
      borderRadius: 999,
      ...t.glass.chip,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
      paddingLeft: t.spacing.sm,
      paddingRight: t.spacing.xs,
    },
    activeChipLabel: {
      color: t.colors.textDark,
      flexShrink: 1,
    },
    activeChipClose: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    clearFiltersChip: {
      minHeight: 36,
      borderRadius: 999,
      ...t.glass.headerControl,
      paddingHorizontal: t.spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    clearFiltersLabel: {
      color: t.colors.textDark,
    },
    chatList: {
      gap: 0,
      paddingTop: topBarVisibleHeight + t.spacing.md,
      paddingBottom: 112,
    },
    chatRow: {
      position: "relative",
      minHeight: 112,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
      paddingLeft: t.spacing.lg,
      paddingRight: t.spacing.md,
      paddingVertical: t.spacing.md,
    },
    chatRowPressed: {
      opacity: 0.72,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primaryLight,
      position: "relative",
    },
    unreadMarker: {
      position: "absolute",
      top: 2,
      right: 2,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: t.colors.primary,
      borderWidth: 2,
      borderColor: t.colors.background,
    },
    avatarText: {
      color: t.colors.primary,
    },
    chatBody: {
      flex: 1,
      minWidth: 0,
      gap: t.spacing.xs,
    },
    chatName: {
      color: t.colors.textDark,
    },
    chatNameUnread: {
      color: t.colors.textDark,
    },
    chatPreview: {
      flexShrink: 1,
    },
    chatContext: {
      flexShrink: 1,
      lineHeight: t.typography.body.lineHeight,
    },
    chatPreviewUnread: {
      color: t.colors.textMedium,
    },
    chatMeta: {
      minWidth: 66,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: t.spacing.xs,
    },
    chatTime: {
      flexShrink: 1,
    },
    chatRowSeparator: {
      position: "absolute",
      left: t.spacing.lg + 52 + t.spacing.md,
      right: t.spacing.md,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(0,0,0,0.08)",
    },
    emptyState: {
      width: "100%",
      alignItems: "center",
      gap: t.spacing.sm,
      padding: t.spacing.lg,
      ...createRoundedSurfaceStyle(t),
    },
    emptyIconBadge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primaryLight,
      marginBottom: t.spacing.xs,
    },
    emptyTitle: {
      color: t.colors.textDark,
    },
    emptyDescription: {
      maxWidth: 260,
    },
    emptyAction: {
      minHeight: 36,
      borderRadius: 999,
      ...t.glass.chip,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.xs,
      paddingHorizontal: t.spacing.md,
      marginTop: t.spacing.xs,
    },
    emptyActionLabel: {
      color: t.colors.textDark,
    },
  });
}
