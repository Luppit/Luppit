import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import RoleGate from "@/src/components/role/RoleGate";
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
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

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

function countChatFilterGroups(filters: ConversationListFilters) {
  return [
    filters.searchValue,
    filters.startDate || filters.endDate,
    filters.selectedCategoryIds.length > 0,
  ].filter(Boolean).length;
}

function getInitial(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

function parseDateTime(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
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

export default function ChatsScreen() {
  const t = useTheme();
  const s = React.useMemo(() => createChatsScreenStyles(t), [t]);

  return (
    <View style={s.screen}>
      <ChatsTopBar title="Chats" />
      <RoleGate
        loading={<LoadingState label="Cargando contenido..." />}
        buyer={<ChatsContent />}
        seller={<ChatsContent />}
      />
    </View>
  );
}

function ChatsContent() {
  const t = useTheme();
  const s = React.useMemo(() => createChatsScreenStyles(t), [t]);
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
    () =>
      [...conversations].sort(
        (first, second) =>
          Number(second.has_unopened) - Number(first.has_unopened) ||
          parseDateTime(second.last_message_at) - parseDateTime(first.last_message_at)
      ),
    [conversations]
  );
  const hasActiveFilters = React.useMemo(() => hasChatFilters(filters), [filters]);
  const activeFilterCount = React.useMemo(() => countChatFilterGroups(filters), [
    filters,
  ]);

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
        title: item.display_name || "Conversación",
      },
    });
  }, []);

  const content = (() => {
    if (isLoading) {
      return <LoadingState label="Cargando chats..." />;
    }

    if (visibleConversations.length === 0) {
      return (
        <Text color="stateAnulated">
          {loadError
            ? "No se pudieron cargar tus chats."
            : hasActiveFilters
              ? "No encontramos chats con los filtros aplicados."
              : "Cuando tengas conversaciones, aparecerán aquí."}
        </Text>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.chatList}
      >
        {visibleConversations.map((item) => (
          <ChatListRow
            key={item.conversation_id}
            item={item}
            onPress={() => openConversation(item)}
          />
        ))}
      </ScrollView>
    );
  })();

  return (
    <View style={s.content}>
      <View style={s.toolbar}>
        <Pressable
          style={s.searchTrigger}
          onPress={openSearchPopup}
          accessibilityRole="button"
        >
          <Icon name="search" size={20} color={t.colors.textDark} />
          <Text variant="body" color="stateAnulated" style={s.searchTriggerText}>
            {hasActiveFilters ? "Filtros aplicados" : "Buscar"}
          </Text>
        </Pressable>
      </View>

      {hasActiveFilters ? (
        <View style={s.activeChipsRow}>
          <View style={s.activeChip}>
            <Icon name="sliders-horizontal" size={16} color={t.colors.textDark} />
            <Text variant="body" style={s.activeChipLabel}>
              Filtros ({activeFilterCount})
            </Text>
            <Pressable
              style={s.activeChipClose}
              onPress={() => setFilters(EMPTY_CHAT_FILTERS)}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros"
            >
              <Icon name="x" size={16} color={t.colors.textDark} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {content}
    </View>
  );
}

function ChatListRow({
  item,
  onPress,
}: {
  item: ConversationListItem;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = React.useMemo(() => createChatsScreenStyles(t), [t]);
  const preview = getMessagePreview(item);
  const title = item.display_name || "Conversación";

  return (
    <Pressable
      style={({ pressed }) => [s.chatRow, pressed && s.chatRowPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={s.unreadMarkerSlot}>
        {item.has_unopened ? <View style={s.unreadMarker} /> : null}
      </View>

      <View style={s.avatar}>
        <Text variant="subtitle" style={s.avatarText}>
          {getInitial(title)}
        </Text>
      </View>

      <View style={s.chatBody}>
        <Text
          variant={item.has_unopened ? "subtitle" : "label"}
          maxLines={1}
          style={s.chatName}
        >
          {title}
        </Text>
        <Text
          variant={item.has_unopened ? "label" : "body"}
          maxLines={1}
          style={s.chatPreview}
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
    </Pressable>
  );
}

function ChatsTopBar({ title }: { title: string }) {
  const t = useTheme();
  const s = React.useMemo(() => createChatsScreenStyles(t), [t]);

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  }, []);

  return (
    <View style={s.topBar}>
      <Pressable onPress={goBack} hitSlop={12} style={s.topBarSide}>
        <Icon name="arrow-left" size={28} color={t.colors.textDark} />
      </Pressable>

      <Text variant="subtitle" align="center" maxLines={1} style={s.topBarTitle}>
        {title}
      </Text>

      <View style={s.topBarSide} />
    </View>
  );
}

function createChatsScreenStyles(t: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    topBar: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: t.colors.background,
    },
    topBarSide: {
      width: 40,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    topBarTitle: {
      flex: 1,
    },
    content: {
      flex: 1,
      gap: t.spacing.md,
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
      backgroundColor: t.colors.backgroudWhite,
      borderWidth: 1,
      borderColor: t.colors.border,
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
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
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
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
    chatList: {
      gap: t.spacing.md,
      paddingBottom: 112,
    },
    chatRow: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingVertical: t.spacing.sm,
    },
    chatRowPressed: {
      opacity: 0.72,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primary,
    },
    unreadMarkerSlot: {
      width: 10,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    unreadMarker: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: t.colors.primary,
    },
    avatarText: {
      color: t.colors.backgroudWhite,
    },
    chatBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    chatName: {
      color: t.colors.textDark,
    },
    chatPreview: {
      color: t.colors.textDark,
    },
    chatMeta: {
      minWidth: 82,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: t.spacing.xs,
    },
    chatTime: {
      flexShrink: 1,
    },
  });
}
