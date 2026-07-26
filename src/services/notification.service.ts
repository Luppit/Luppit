import { RPC_FUNCTIONS } from "../db/functions";
import {
  COL_NOTIFICATION_TYPE_CATALOG,
  COL_PROFILE_NOTIFICATION,
  TB_NOTIFICATION_TYPE_CATALOG,
  TB_PROFILE_NOTIFICATION,
} from "../db/tables";
import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getCurrentProfileResult } from "./active.profile.service";

type ProfileNotification = Row<"profile_notification">;
type NotificationRow = Row<"notification">;
type NotificationTypeCatalog = Row<"notification_type_catalog">;

type ProfileNotificationRecord = ProfileNotification & {
  notification: NotificationRow | null;
};

export type ProfileNotificationListItem = {
  notificationId: string;
  profileId: string;
  title: string | null;
  message: string;
  typeCode: string;
  typeLabel: string | null;
  typeDescription: string | null;
  eventCode: string | null;
  navigation: ProfileNotificationNavigation | null;
  createdAt: string;
  readAt: string | null;
};

export type ProfileNotificationNavigation =
  | { kind: "conversation"; conversationId: string }
  | { kind: "purchaseRequest"; purchaseRequestId: string };

export type MarkCurrentProfileNotificationReadResult = {
  notificationId: string;
  readAt: string;
  wasUnread: boolean;
  remainingUnreadCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseNotificationNavigation(
  payload: NotificationRow["payload"]
): ProfileNotificationNavigation | null {
  if (!isRecord(payload) || !isRecord(payload.navigation)) return null;

  const pathname = getNonEmptyString(payload.navigation.pathname);
  const params = isRecord(payload.navigation.params) ? payload.navigation.params : null;
  if (!pathname || !params) return null;

  if (pathname === "/(conversation)/offer") {
    const conversationId = getNonEmptyString(params.conversationId);
    return conversationId ? { kind: "conversation", conversationId } : null;
  }

  if (pathname === "/request/[purchaseRequestId]") {
    const purchaseRequestId = getNonEmptyString(params.purchaseRequestId);
    return purchaseRequestId
      ? { kind: "purchaseRequest", purchaseRequestId }
      : null;
  }

  return null;
}

async function getCurrentProfileId(): Promise<
  { ok: true; data: string } | { ok: false; error: AppError }
> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return { ok: false, error: fromSupabaseError(error) };

  const userId = data.session?.user.id;
  if (!userId) return { ok: false, error: fromAppError("auth") };

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  return { ok: true, data: profile.data.id };
}

export async function getCurrentProfileNotifications(): Promise<
  { ok: true; data: ProfileNotificationListItem[] } | { ok: false; error: AppError }
> {
  const profileResult = await getCurrentProfileId();
  if (!profileResult.ok) return profileResult;

  const { data, error } = await supabase
    .from(TB_PROFILE_NOTIFICATION)
    .select(
      [
        "notification_id",
        "profile_id",
        "read_at",
        "created_at",
        "notification:notification_id(id,title,message,type_code,event_code,payload,created_at)",
      ].join(",")
    )
    .eq(COL_PROFILE_NOTIFICATION.profile_id, profileResult.data);

  if (error) return { ok: false, error: fromSupabaseError(error) };

  const rows = ((data ?? []) as unknown as ProfileNotificationRecord[]).filter(
    (row) => row.notification != null
  );
  const typeCodes = Array.from(
    new Set(
      rows
        .map((row) => row.notification?.type_code?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
  const typeByCode = new Map<string, NotificationTypeCatalog>();

  if (typeCodes.length > 0) {
    const typeResult = await supabase
      .from(TB_NOTIFICATION_TYPE_CATALOG)
      .select("code,label,description,is_active,sort_order,created_at")
      .in(COL_NOTIFICATION_TYPE_CATALOG.code, typeCodes);

    if (typeResult.error) return { ok: false, error: fromSupabaseError(typeResult.error) };

    for (const item of typeResult.data ?? []) {
      typeByCode.set(item.code, item as NotificationTypeCatalog);
    }
  }

  const notifications = rows
    .map((row) => {
      const notification = row.notification as NotificationRow;
      const type = typeByCode.get(notification.type_code);

      return {
        notificationId: notification.id,
        profileId: row.profile_id,
        title: notification.title,
        message: notification.message,
        typeCode: notification.type_code,
        typeLabel: type?.label ?? null,
        typeDescription: type?.description ?? null,
        eventCode: notification.event_code,
        navigation: parseNotificationNavigation(notification.payload),
        createdAt: notification.created_at,
        readAt: row.read_at,
      };
    })
    .sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return (Number.isNaN(right) ? 0 : right) - (Number.isNaN(left) ? 0 : left);
    });

  return { ok: true, data: notifications };
}

export async function markAllCurrentProfileNotificationsRead(): Promise<
  { ok: true; data: unknown } | { ok: false; error: AppError }
> {
  const profileResult = await getCurrentProfileId();
  if (!profileResult.ok) return profileResult;

  const result = await supabase.rpc(
    RPC_FUNCTIONS.MARK_ALL_PROFILE_NOTIFICATIONS_READ,
    { p_profile_id: profileResult.data }
  );

  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };

  return { ok: true, data: result.data };
}

export async function markCurrentProfileNotificationRead(
  notificationId: string
): Promise<
  | { ok: true; data: MarkCurrentProfileNotificationReadResult }
  | { ok: false; error: AppError }
> {
  const normalizedNotificationId = notificationId.trim();
  if (!normalizedNotificationId) {
    return { ok: false, error: fromAppError("validation") };
  }

  const profileResult = await getCurrentProfileId();
  if (!profileResult.ok) return profileResult;

  const result = await supabase.rpc(
    RPC_FUNCTIONS.MARK_PROFILE_NOTIFICATION_READ,
    {
      p_profile_id: profileResult.data,
      p_notification_id: normalizedNotificationId,
    }
  );

  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  if (!isRecord(result.data)) {
    return { ok: false, error: fromAppError("unknown") };
  }

  const returnedNotificationId = getNonEmptyString(result.data.notification_id);
  const readAt = getNonEmptyString(result.data.read_at);
  const remainingUnreadCount = result.data.remaining_unread_count;
  const wasUnread = result.data.was_unread;

  if (
    !returnedNotificationId ||
    !readAt ||
    typeof wasUnread !== "boolean" ||
    typeof remainingUnreadCount !== "number" ||
    !Number.isFinite(remainingUnreadCount)
  ) {
    return { ok: false, error: fromAppError("unknown") };
  }

  return {
    ok: true,
    data: {
      notificationId: returnedNotificationId,
      readAt,
      wasUnread,
      remainingUnreadCount: Math.max(0, Math.trunc(remainingUnreadCount)),
    },
  };
}

export async function getCurrentProfileUnreadNotificationCount(): Promise<
  { ok: true; data: number } | { ok: false; error: AppError }
> {
  const profileResult = await getCurrentProfileId();
  if (!profileResult.ok) return profileResult;

  const { count, error } = await supabase
    .from(TB_PROFILE_NOTIFICATION)
    .select("notification_id", { count: "exact", head: true })
    .eq(COL_PROFILE_NOTIFICATION.profile_id, profileResult.data)
    .is(COL_PROFILE_NOTIFICATION.read_at, null);

  if (error) return { ok: false, error: fromSupabaseError(error) };

  return { ok: true, data: count ?? 0 };
}
