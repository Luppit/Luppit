import { Icon } from "@/src/components/Icon";
import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import StandaloneListEmptyState from "@/src/components/standaloneList/StandaloneListEmptyState";
import { Text } from "@/src/components/Text";
import {
  dismissAllCurrentProfileNotifications,
  getCurrentProfileNotifications,
  markCurrentProfileNotificationRead,
  ProfileNotificationListItem,
} from "@/src/services/notification.service";
import { openPopup, PopupSummaryAction } from "@/src/services/popup.service";
import { fontFamilies, Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMinutes < 1) return "Ahora";
  if (diffMinutes < 60) return `${diffMinutes} min`;
  if (diffHours < 24) return `${diffHours} h`;

  const isCurrentYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    ...(isCurrentYear ? {} : { year: "numeric" as const }),
  });
}

function formatNotificationAccessibleTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "en una fecha desconocida";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMinutes < 1) return "ahora";
  if (diffMinutes === 1) return "hace 1 minuto";
  if (diffMinutes < 60) return `hace ${diffMinutes} minutos`;
  if (diffHours === 1) return "hace 1 hora";
  if (diffHours < 24) return `hace ${diffHours} horas`;

  return `el ${date.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

function formatNotificationReceivedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const dateLabel = date.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("es-CR", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateLabel} · ${timeLabel}`;
}

function getNotificationTypeLabel(notification: ProfileNotificationListItem) {
  if (notification.typeCode.trim().toLowerCase() === "information") return null;
  return notification.typeLabel?.trim() || null;
}

function getNotificationAccessiblePreview(message: string) {
  const normalized = message.trim().replace(/\s+/g, " ");
  if (normalized.length <= 100) return normalized;
  return `${normalized.slice(0, 97).trimEnd()}…`;
}

function getNotificationTone(t: Theme, typeCode: string) {
  const code = typeCode.trim().toLowerCase();

  if (code === "urgent") {
    return {
      icon: "alert-circle" as const,
      color: t.colors.error,
    };
  }

  if (code === "action_needed") {
    return {
      icon: "file-pen-line" as const,
      color: t.colors.secondary,
    };
  }

  return {
    icon: "info" as const,
    color: t.colors.info,
  };
}

function getNotificationActions(
  notification: ProfileNotificationListItem
): PopupSummaryAction[] {
  if (notification.navigation?.kind === "conversation") {
    const conversationId = notification.navigation.conversationId;
    return [
      {
        id: "open-conversation",
        label: "Ver conversación",
        icon: "message-circle",
        backgroundColorKey: "primary",
        textColorKey: "backgroudWhite",
        iconColorKey: "backgroudWhite",
        onPress: () =>
          router.push({
            pathname: "/(conversation)/offer",
            params: { conversationId },
          }),
      },
    ];
  }

  if (notification.navigation?.kind === "purchaseRequest") {
    const purchaseRequestId = notification.navigation.purchaseRequestId;
    return [
      {
        id: "open-request",
        label: "Ver solicitud",
        icon: "file-text",
        backgroundColorKey: "primary",
        textColorKey: "backgroudWhite",
        iconColorKey: "backgroudWhite",
        onPress: () =>
          router.push({
            pathname: "/request/[purchaseRequestId]",
            params: { purchaseRequestId },
          }),
      },
    ];
  }

  if (notification.navigation?.kind === "businessVerification") {
    return [
      {
        id: "open-business-verification",
        label: "Ver verificación",
        icon: "shield-check",
        backgroundColorKey: "primary",
        textColorKey: "backgroudWhite",
        iconColorKey: "backgroudWhite",
        onPress: () =>
          router.push({
            pathname: "/(detail)/business-verification",
            params: { title: "Verificar negocio", hideMenu: "true" },
          }),
      },
    ];
  }

  return [];
}

export default function NotificationsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { applyUnreadNotificationCount, refreshUnreadNotificationCount } =
    useActiveProfile();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = React.useMemo(
    () => createNotificationsStyles(t, topContentInset),
    [t, topContentInset]
  );
  const [notifications, setNotifications] = React.useState<ProfileNotificationListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const isMountedRef = React.useRef(true);
  const markingNotificationIdsRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    void refreshUnreadNotificationCount();
    setIsLoading(false);
  }, [refreshUnreadNotificationCount]);

  const markNotificationRead = React.useCallback(
    async (notification: ProfileNotificationListItem) => {
      if (
        notification.readAt != null ||
        markingNotificationIdsRef.current.has(notification.notificationId)
      ) {
        return;
      }

      markingNotificationIdsRef.current.add(notification.notificationId);
      const result = await markCurrentProfileNotificationRead(
        notification.notificationId
      );
      markingNotificationIdsRef.current.delete(notification.notificationId);
      if (!isMountedRef.current) return;

      if (!result.ok) {
        showError("No se pudo marcar como leída", result.error.message);
        return;
      }

      setNotifications((current) =>
        current.map((item) =>
          item.notificationId === result.data.notificationId
            ? { ...item, readAt: result.data.readAt }
            : item
        )
      );
      void refreshUnreadNotificationCount();
    },
    [refreshUnreadNotificationCount]
  );

  const openNotificationDetail = React.useCallback(
    (notification: ProfileNotificationListItem) => {
      const title = notification.title?.trim() || "Novedad en Luppit";
      const metadata = [
        getNotificationTypeLabel(notification),
        formatNotificationReceivedAt(notification.createdAt),
      ]
        .filter(Boolean)
        .join(" · ");

      openPopup({
        type: "summary",
        title,
        metadata,
        showCloseButton: true,
        description: notification.message,
        actions: getNotificationActions(notification),
      });
      void markNotificationRead(notification);
    },
    [markNotificationRead]
  );

  const openDismissAllConfirmation = React.useCallback(() => {
    openPopup({
      type: "summary",
      title: "Limpiar notificaciones",
      icon: "trash-2",
      description:
        "Las notificaciones actuales dejarán de aparecer. Las nuevas notificaciones seguirán mostrándose normalmente.",
      actions: [
        {
          id: "keep-notifications",
          label: "Volver",
          icon: "arrow-left",
          backgroundColorKey: "backgroudWhite",
          textColorKey: "textDark",
          iconColorKey: "textDark",
        },
        {
          id: "dismiss-all-notifications",
          label: "Limpiar todas",
          icon: "trash-2",
          backgroundColorKey: "backgroudWhite",
          textColorKey: "error",
          iconColorKey: "error",
          onPress: async () => {
            const result = await dismissAllCurrentProfileNotifications();
            if (!isMountedRef.current) return true;

            if (!result.ok) {
              showError(
                "No se pudieron limpiar tus notificaciones",
                result.error.message
              );
              return false;
            }

            setNotifications([]);
            setLoadError(null);
            applyUnreadNotificationCount(result.data.remainingUnreadCount);
            showSuccess("Notificaciones limpiadas");
            return true;
          },
        },
      ],
    });
  }, [applyUnreadNotificationCount]);

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
        <StandaloneListEmptyState
          icon="alert-circle"
          title="No pudimos cargar tus notificaciones"
          description="Inténtalo nuevamente."
          actionLabel="Reintentar"
          onAction={() => void loadNotifications()}
        />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={s.centerState}>
        <StandaloneListEmptyState
          icon="bell"
          title="Sin notificaciones"
          description="Las novedades importantes de tu actividad aparecerán aquí."
        />
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <GroupedListSection
        title={
          notifications.length === 1
            ? "1 notificación"
            : `${notifications.length} notificaciones`
        }
      >
        {notifications.map((notification, index) => (
          <NotificationRow
            key={notification.notificationId}
            notification={notification}
            showSeparator={index < notifications.length - 1}
            onPress={() => openNotificationDetail(notification)}
          />
        ))}
      </GroupedListSection>

      <GroupedListSection title="Administrar">
        <GroupedListRow
          icon="trash-2"
          label="Limpiar notificaciones"
          description="Oculta las notificaciones actuales de este perfil."
          destructive
          showSeparator={false}
          onPress={openDismissAllConfirmation}
          accessibilityLabel="Limpiar todas las notificaciones"
        />
      </GroupedListSection>
    </ScrollView>
  );
}

function NotificationRow({
  notification,
  showSeparator,
  onPress,
}: {
  notification: ProfileNotificationListItem;
  showSeparator: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = React.useMemo(() => createNotificationsStyles(t), [t]);
  const tone = getNotificationTone(t, notification.typeCode);
  const isUnread = notification.readAt == null;
  const title = notification.title?.trim() || "Novedad en Luppit";
  const accessibleTime = formatNotificationAccessibleTime(notification.createdAt);
  const accessiblePreview = getNotificationAccessiblePreview(notification.message);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isUnread ? "Sin leer. " : ""}${title}. ${accessiblePreview}. Recibida ${accessibleTime}.`}
      accessibilityHint="Abre el detalle de la notificación."
      onPress={onPress}
      style={s.row}
    >
      <View style={s.unreadSlot} accessibilityElementsHidden importantForAccessibility="no">
        {isUnread ? <View style={s.unreadDot} /> : null}
      </View>
      <View
        style={s.iconBadge}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <Icon name={tone.icon} size={20} color={tone.color} />
      </View>
      <View style={s.rowBody}>
        <View style={s.rowHeader}>
          <Text
            variant="body"
            color={isUnread ? "textDark" : "textMedium"}
            maxLines={1}
            style={[s.rowTitle, isUnread ? s.rowTitleUnread : null]}
          >
            {title}
          </Text>
          <Text variant="small" color="textMedium" maxLines={1}>
            {formatNotificationTime(notification.createdAt)}
          </Text>
        </View>
        <Text
          variant="small"
          color="textMedium"
          maxLines={2}
        >
          {notification.message}
        </Text>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no">
        <Icon name="chevron-right" size={18} color={t.colors.stateAnulated} />
      </View>
      {showSeparator ? <View style={s.rowSeparator} /> : null}
    </Pressable>
  );
}

function createNotificationsStyles(t: Theme, topContentInset = 0) {
  return StyleSheet.create({
    content: {
      paddingTop: topContentInset + t.spacing.md,
      paddingBottom: t.spacing.xl,
      gap: t.spacing.lg,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingTop: topContentInset,
    },
    row: {
      position: "relative",
      minHeight: 88,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
    },
    unreadSlot: {
      width: 8,
      alignItems: "center",
    },
    unreadDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: t.colors.primary,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.background,
    },
    rowBody: {
      flex: 1,
      minHeight: 54,
      justifyContent: "center",
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
    rowTitleUnread: {
      fontFamily: fontFamilies.medium,
    },
    rowSeparator: {
      position: "absolute",
      left: t.spacing.md + 8 + t.spacing.sm + 36 + t.spacing.sm,
      right: t.spacing.md,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(0,0,0,0.08)",
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: topContentInset,
      paddingHorizontal: t.spacing.lg,
    },
  });
}
