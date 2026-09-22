import LuppitChip from "@/src/components/chip/LuppitChip";
import { GroupedList } from "@/src/components/groupedList/GroupedList";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import ProfilePicture, { ProfilePictureKind } from "@/src/components/profile/ProfilePicture";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import StandaloneListEmptyState from "@/src/components/standaloneList/StandaloneListEmptyState";
import { Text } from "@/src/components/Text";
import {
  dismissAllCurrentProfileNotifications,
  getCurrentProfileNotifications,
  markAllCurrentProfileNotificationsRead,
  markCurrentProfileNotificationRead,
  ProfileNotificationListItem,
} from "@/src/services/notification.service";
import { openPopup, PopupSummaryAction } from "@/src/services/popup.service";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
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

function getNotificationIcon(notification: ProfileNotificationListItem) {
  if (notification.typeCode.trim().toLowerCase() === "urgent") return "alert-circle";
  if (notification.navigation?.kind === "conversation") return "message-circle";
  if (notification.navigation?.kind === "purchaseRequest") return "file-text";
  if (notification.navigation?.kind === "businessVerification") return "shield-check";
  return "bell";
}

function getNotificationSenderName(
  notification: ProfileNotificationListItem,
  counterpartKind: ProfilePictureKind | null
) {
  if (!notification.conversationId || !counterpartKind) return "Luppit";
  return notification.counterpartName?.trim() ||
    (counterpartKind === "business" ? "Negocio" : "Comprador");
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
            params: { title: "Verificación del negocio", hideMenu: "true" },
          }),
      },
    ];
  }

  return [];
}

export default function NotificationsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { activeProfile, unreadNotificationCount, applyUnreadNotificationCount, refreshUnreadNotificationCount } =
    useActiveProfile();
  const counterpartKind: ProfilePictureKind | null = activeProfile?.role === "buyer"
    ? "business"
    : activeProfile?.role === "seller"
      ? "buyer"
      : null;
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = React.useMemo(
    () => createNotificationsStyles(t, topContentInset),
    [t, topContentInset]
  );
  const [notifications, setNotifications] = React.useState<ProfileNotificationListItem[]>([]);
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = React.useState(false);
  const isMountedRef = React.useRef(true);
  const markingAllReadRef = React.useRef(false);
  const markingNotificationIdsRef = React.useRef(new Set<string>());
  const hasUnreadNotifications =
    unreadNotificationCount > 0 || notifications.some((item) => item.readAt == null);

  const visibleNotifications = notifications.filter(
    (item) => filter === "all" || item.readAt == null
  );
  const today = new Date().toDateString();
  const sections = [
    {
      title: "Hoy",
      items: visibleNotifications.filter((item) => new Date(item.createdAt).toDateString() === today),
    },
    {
      title: "Anteriores",
      items: visibleNotifications.filter((item) => new Date(item.createdAt).toDateString() !== today),
    },
  ].filter((section) => section.items.length > 0);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadNotifications = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [result, countRefreshed] = await Promise.all([
        getCurrentProfileNotifications(),
        refreshUnreadNotificationCount(),
      ]);
      if (!isMountedRef.current) return false;

      if (!result.ok || !countRefreshed) {
        const message = !result.ok
          ? result.error.message
          : "No se pudo actualizar el conteo de notificaciones sin leer.";
        setNotifications([]);
        setLoadError(message);
        showError("No se pudieron cargar tus notificaciones", message);
        return false;
      }

      setNotifications(result.data);
      return true;
    } catch {
      if (isMountedRef.current) {
        setLoadError("Inténtalo nuevamente.");
        showError("No se pudieron cargar tus notificaciones", "Inténtalo nuevamente.");
      }
      return false;
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [refreshUnreadNotificationCount]);

  const markAllNotificationsRead = React.useCallback(async () => {
    if (markingAllReadRef.current || !hasUnreadNotifications) return;

    markingAllReadRef.current = true;
    setIsMarkingAllRead(true);
    try {
      const result = await markAllCurrentProfileNotificationsRead();
      if (!isMountedRef.current) return;

      if (!result.ok) {
        showError("No se pudieron marcar como leídas", result.error.message);
        return;
      }

      if (await loadNotifications()) {
        showSuccess("Notificaciones marcadas como leídas");
      }
    } catch {
      if (isMountedRef.current) {
        showError("No se pudieron actualizar tus notificaciones", "Inténtalo nuevamente.");
        setIsLoading(false);
      }
    } finally {
      markingAllReadRef.current = false;
      if (isMountedRef.current) setIsMarkingAllRead(false);
    }
  }, [hasUnreadNotifications, loadNotifications]);

  const markNotificationRead = React.useCallback(
    async (notification: ProfileNotificationListItem) => {
      if (
        markingAllReadRef.current ||
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
      if (markingAllReadRef.current) return;
      const title = notification.title?.trim() || "Novedad en Luppit";
      const metadata = [
        getNotificationSenderName(notification, counterpartKind),
        getNotificationTypeLabel(notification),
        formatNotificationReceivedAt(notification.createdAt),
      ]
        .filter(Boolean)
        .join(" · ");

      openPopup({
        type: "summary",
        title,
        metadata,
        description: notification.message,
        actions: getNotificationActions(notification),
      });
      void markNotificationRead(notification);
    },
    [counterpartKind, markNotificationRead]
  );

  const openDismissAllConfirmation = React.useCallback(() => {
    if (markingAllReadRef.current) return;
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
          label: "Limpiar",
          accessibilityLabel: "Limpiar todas las notificaciones",
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
      <View style={s.controls}>
        <View style={s.toolbar}>
          <View style={s.filters}>
            <LuppitChip
              label="Todas"
              selected={filter === "all"}
              bordered
              onPress={() => setFilter("all")}
            />
            <LuppitChip
              label="Sin leer"
              count={unreadNotificationCount}
              selected={filter === "unread"}
              bordered
              accessibilityLabel={`Sin leer, ${unreadNotificationCount} notificaciones`}
              onPress={() => setFilter("unread")}
            />
          </View>
          <Pressable
            testID="notification-options"
            accessibilityRole="button"
            accessibilityLabel="Opciones de notificaciones"
            accessibilityState={{ disabled: isMarkingAllRead }}
            disabled={isMarkingAllRead}
            onPress={isMarkingAllRead ? undefined : () => openPopup({
              options: [{
                id: "clear-notifications",
                label: "Limpiar notificaciones",
                icon: "trash-2",
                textColorKey: "error",
                iconColorKey: "error",
                onPress: openDismissAllConfirmation,
              }],
            })}
            style={({ pressed }) => [
              s.optionsButton,
              pressed ? s.controlPressed : null,
            ]}
          >
            <Icon name="ellipsis" size={22} color={t.colors.textMedium} />
          </Pressable>
        </View>
        <Pressable
          testID="mark-all-notifications-read"
          accessibilityRole="button"
          accessibilityLabel={isMarkingAllRead
            ? "Marcando como leídas"
            : hasUnreadNotifications
              ? "Marcar todas como leídas"
              : "Marcar todas como leídas. No tienes notificaciones sin leer."}
          accessibilityState={{ busy: isMarkingAllRead, disabled: isMarkingAllRead || !hasUnreadNotifications }}
          accessibilityLiveRegion="polite"
          disabled={isMarkingAllRead || !hasUnreadNotifications}
          onPress={isMarkingAllRead || !hasUnreadNotifications
            ? undefined
            : () => void markAllNotificationsRead()}
          style={({ pressed }) => [
            s.markAllButton,
            !hasUnreadNotifications ? s.disabledAction : null,
            pressed ? s.controlPressed : null,
          ]}
        >
          {isMarkingAllRead
            ? <ActivityIndicator size="small" color={t.colors.primary} />
            : <Icon name="check-check" size={18} color={t.colors.primary} />}
          <Text variant="small" color="primary" style={s.markAllLabel}>
            {isMarkingAllRead ? "Marcando como leídas..." : "Marcar todas como leídas"}
          </Text>
        </Pressable>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={s.activitySection}>
          <Text variant="small" color="textMedium" style={s.sectionTitle}>{section.title}</Text>
          <GroupedList>
            {section.items.map((notification, index) => (
              <NotificationRow
                key={notification.notificationId}
                notification={notification}
                counterpartKind={counterpartKind}
                showSeparator={index < section.items.length - 1}
                disabled={isMarkingAllRead}
                onPress={() => openNotificationDetail(notification)}
              />
            ))}
          </GroupedList>
        </View>
      ))}
      {visibleNotifications.length === 0 ? (
        <View style={s.filteredEmptyState}>
          <StandaloneListEmptyState
            icon="check-check"
            title="Todo al día"
            description="No tienes notificaciones sin leer."
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

function NotificationRow({
  notification,
  counterpartKind,
  showSeparator,
  disabled,
  onPress,
}: {
  notification: ProfileNotificationListItem;
  counterpartKind: ProfilePictureKind | null;
  showSeparator: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = React.useMemo(() => createNotificationsStyles(t), [t]);
  const icon = getNotificationIcon(notification);
  const typeLabel = getNotificationTypeLabel(notification);
  const typeColor = notification.typeCode.trim().toLowerCase() === "urgent" ? "error" : "textMedium";
  const isUnread = notification.readAt == null;
  const title = notification.title?.trim() || "Novedad en Luppit";
  const accessibleTime = formatNotificationAccessibleTime(notification.createdAt);
  const accessiblePreview = getNotificationAccessiblePreview(notification.message);
  const hasCounterpart = Boolean(notification.conversationId && counterpartKind);
  const senderName = getNotificationSenderName(notification, counterpartKind);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isUnread ? "Sin leer. " : ""}${senderName}. ${title}. ${accessiblePreview}. Recibida ${accessibleTime}.`}
      accessibilityHint="Abre el detalle de la notificación."
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed ? s.rowPressed : null]}
    >
      {hasCounterpart && counterpartKind ? (
        <ProfilePicture
          kind={counterpartKind}
          name={senderName}
          imagePath={notification.counterpartImagePath}
          size={44}
          accessible={false}
        />
      ) : (
        <View
          style={s.iconBadge}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Icon name={icon} size={24} color={t.colors.primary} />
        </View>
      )}
      <View style={s.rowBody}>
        <View style={s.rowTitleLine}>
          <Text
            variant="body"
            maxLines={2}
            style={[s.rowTitle, isUnread ? s.rowTitleUnread : null]}
          >
            {title}
          </Text>
          <Text variant="small" color="stateAnulated" maxLines={1} style={s.rowTime}>
            {formatNotificationTime(notification.createdAt)}
          </Text>
        </View>
        <Text variant="small" color="textDark" maxLines={2}>
          {senderName}
        </Text>
        <Text variant="small" color="textMedium" maxLines={2}>
          {notification.message}
        </Text>
        {typeLabel ? (
          <Text variant="small" color={typeColor} maxLines={2}>
            {typeLabel}
          </Text>
        ) : null}
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
    activitySection: {
      gap: t.spacing.sm,
    },
    sectionTitle: {
      paddingHorizontal: t.spacing.md,
    },
    controls: {
      gap: t.spacing.sm,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.spacing.sm,
    },
    filters: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.spacing.sm,
    },
    optionsButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      ...createRoundedSurfaceStyle(t),
      alignItems: "center",
      justifyContent: "center",
    },
    markAllButton: {
      minHeight: 44,
      alignSelf: "stretch",
      ...createRoundedSurfaceStyle(t),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
    },
    markAllLabel: {
      flexShrink: 1,
    },
    disabledAction: {
      opacity: 0.5,
    },
    controlPressed: {
      backgroundColor: t.colors.primaryLight,
    },
    filteredEmptyState: {
      paddingVertical: t.spacing.xl,
    },
    row: {
      position: "relative",
      minHeight: 96,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.spacing.md,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
    },
    rowPressed: {
      backgroundColor: t.colors.primaryLight,
    },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primaryLight,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
      gap: t.spacing.xs,
    },
    rowTitleLine: {
      minWidth: 0,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.spacing.sm,
    },
    rowTitle: {
      flex: 1,
      minWidth: 0,
    },
    rowTitleUnread: {
      fontFamily: t.typography.subtitle.fontFamily,
    },
    rowTime: {
      maxWidth: 64,
      flexShrink: 1,
      textAlign: "right",
      paddingTop: 2,
    },
    rowSeparator: {
      position: "absolute",
      left: t.spacing.md + 44 + t.spacing.md,
      right: t.spacing.md,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.colors.border,
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
