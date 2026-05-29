import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import {
  getCurrentProfileNotifications,
  markAllCurrentProfileNotificationsRead,
  ProfileNotificationListItem,
} from "@/src/services/notification.service";
import { openPopup } from "@/src/services/popup.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMinutes < 1) return "Ahora";
  if (diffMinutes < 60) return `${diffMinutes} min`;
  if (diffHours < 24) return `${diffHours} h`;

  return date.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
  });
}

function formatNotificationReceivedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("es-CR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getNotificationTone(t: Theme, typeCode: string) {
  const code = typeCode.trim().toLowerCase();

  if (code === "urgent") {
    return {
      icon: "alert-circle" as const,
      color: t.colors.error,
      backgroundColor: "rgba(165, 33, 0, 0.10)",
    };
  }

  if (code === "action_needed") {
    return {
      icon: "file-pen-line" as const,
      color: t.colors.secondary,
      backgroundColor: "rgba(202, 115, 48, 0.12)",
    };
  }

  return {
    icon: "info" as const,
    color: t.colors.info,
    backgroundColor: "rgba(119, 190, 240, 0.14)",
  };
}

export default function NotificationsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = React.useMemo(
    () => createNotificationsStyles(t, topContentInset),
    [t, topContentInset]
  );
  const [notifications, setNotifications] = React.useState<ProfileNotificationListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const markLoadedNotificationsRead = React.useCallback(
    async (items: ProfileNotificationListItem[]) => {
      const unreadNotificationIds = new Set(
        items
          .filter((item) => item.readAt == null)
          .map((item) => item.notificationId)
      );
      if (unreadNotificationIds.size === 0) return;

      const result = await markAllCurrentProfileNotificationsRead();
      if (!isMountedRef.current) return;

      if (!result.ok) {
        showError("No se pudieron actualizar tus notificaciones", result.error.message);
        return;
      }

      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) =>
          item.readAt == null && unreadNotificationIds.has(item.notificationId)
            ? { ...item, readAt }
            : item
        )
      );
    },
    []
  );

  const loadNotifications = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const result = await getCurrentProfileNotifications();
    if (!isMountedRef.current) return;

    if (!result.ok) {
      setNotifications([]);
      setLoadError(result.error.message);
      setIsLoading(false);
      showError("No se pudieron cargar tus notificaciones", result.error.message);
      return;
    }

    setNotifications(result.data);
    setIsLoading(false);
    void markLoadedNotificationsRead(result.data);
  }, [markLoadedNotificationsRead]);

  useFocusEffect(
    React.useCallback(() => {
      void loadNotifications();
      return () => {};
    }, [loadNotifications])
  );

  if (isLoading) {
    return <LoadingState label="Cargando notificaciones..." style={s.loadingBox} />;
  }

  if (loadError) {
    return (
      <View style={s.centerState}>
        <View style={s.emptyIconBadge}>
          <Icon name="bell" size={28} color={t.colors.stateAnulated} />
        </View>
        <Text variant="subtitle" align="center">
          No se pudieron cargar tus notificaciones.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadNotifications()}
          style={s.retryButton}
        >
          <Text color="primary">Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={s.centerState}>
        <View style={s.emptyIconBadge}>
          <Icon name="bell" size={28} color={t.colors.textDark} />
        </View>
        <Text variant="subtitle" align="center">
          Sin notificaciones
        </Text>
        <Text color="textMedium" align="center" style={s.emptyDescription}>
          Cuando haya novedades sobre tus solicitudes, ofertas o chats, aparecerán aquí.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <View style={s.list}>
        {notifications.map((notification) => (
          <NotificationRow key={notification.notificationId} notification={notification} />
        ))}
      </View>
    </ScrollView>
  );
}

function NotificationRow({
  notification,
}: {
  notification: ProfileNotificationListItem;
}) {
  const t = useTheme();
  const s = React.useMemo(() => createNotificationsStyles(t), [t]);
  const tone = getNotificationTone(t, notification.typeCode);
  const isUnread = notification.readAt == null;
  const title = notification.typeLabel || "Notificación";
  const openNotificationDetail = () => {
    openPopup({
      type: "summary",
      title,
      icon: tone.icon,
      rows: [
        {
          label: "Recibida",
          value: formatNotificationReceivedAt(notification.createdAt),
        },
      ],
      description: notification.message,
      descriptionPlacement: "afterRows",
      actions: [
        {
          id: "done",
          label: "Listo",
          icon: "check",
          backgroundColorKey: "primary",
          textColorKey: "backgroudWhite",
          iconColorKey: "backgroudWhite",
        },
      ],
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${notification.message}`}
      accessibilityHint="Abre el detalle de la notificación."
      onPress={openNotificationDetail}
      style={s.row}
    >
      <View style={s.unreadSlot}>
        {isUnread ? <View style={s.unreadDot} /> : null}
      </View>
      <View style={[s.iconBadge, { backgroundColor: tone.backgroundColor }]}>
        <Icon name={tone.icon} size={22} color={tone.color} />
      </View>
      <View style={s.rowBody}>
        <View style={s.rowHeader}>
          <Text
            variant={isUnread ? "subtitle" : "body"}
            color={isUnread ? "textDark" : "textMedium"}
            maxLines={1}
            style={s.rowTitle}
          >
            {title}
          </Text>
          <Text variant="caption" color="stateAnulated" maxLines={1}>
            {formatNotificationTime(notification.createdAt)}
          </Text>
        </View>
        <Text color={isUnread ? "textMedium" : "stateAnulated"} maxLines={2}>
          {notification.message}
        </Text>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no">
        <Icon name="chevron-right" size={18} color={t.colors.stateAnulated} />
      </View>
    </Pressable>
  );
}

function createNotificationsStyles(t: Theme, topContentInset = 0) {
  return StyleSheet.create({
    content: {
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
    list: {
      borderTopWidth: 0,
    },
    row: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    unreadSlot: {
      width: 10,
      alignItems: "center",
    },
    unreadDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: t.colors.primary,
    },
    iconBadge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    rowBody: {
      flex: 1,
      gap: 3,
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    rowTitle: {
      flex: 1,
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
