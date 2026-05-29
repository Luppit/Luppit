import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getProfileByUserId } from "./profile.service";

type ProfileNotification = Row<"profile_notification">;
type NotificationRow = Row<"notification">;
type NotificationTypeCatalog = Row<"notification_type_catalog">;

type ProfileNotificationRecord = ProfileNotification & {
  notification: NotificationRow | null;
};

export type ProfileNotificationListItem = {
  notificationId: string;
  profileId: string;
  message: string;
  typeCode: string;
  typeLabel: string | null;
  typeDescription: string | null;
  createdAt: string;
  readAt: string | null;
};

async function getCurrentProfileId(): Promise<
  { ok: true; data: string } | { ok: false; error: AppError }
> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return { ok: false, error: fromSupabaseError(error) };

  const userId = data.session?.user.id;
  if (!userId) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(userId);
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
    .from("profile_notification")
    .select(
      [
        "notification_id",
        "profile_id",
        "read_at",
        "created_at",
        "notification:notification_id(id,message,type_code,created_at)",
      ].join(",")
    )
    .eq("profile_id", profileResult.data);

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
      .from("notification_type_catalog")
      .select("code,label,description,is_active,sort_order,created_at")
      .in("code", typeCodes);

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
        message: notification.message,
        typeCode: notification.type_code,
        typeLabel: type?.label ?? null,
        typeDescription: type?.description ?? null,
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

  const result = await supabase.rpc("mark_all_profile_notifications_read", {
    p_profile_id: profileResult.data,
  });

  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };

  return { ok: true, data: result.data };
}

export async function getCurrentProfileUnreadNotificationCount(): Promise<
  { ok: true; data: number } | { ok: false; error: AppError }
> {
  const profileResult = await getCurrentProfileId();
  if (!profileResult.ok) return profileResult;

  const { count, error } = await supabase
    .from("profile_notification")
    .select("notification_id", { count: "exact", head: true })
    .eq("profile_id", profileResult.data)
    .is("read_at", null);

  if (error) return { ok: false, error: fromSupabaseError(error) };

  return { ok: true, data: count ?? 0 };
}
