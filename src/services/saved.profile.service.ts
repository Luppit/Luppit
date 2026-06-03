import { createKVStorage } from "@/src/store/factory";
import type { Profile } from "@/src/services/profile.service";

const storage = createKVStorage();
const SAVED_PROFILES_KEY = "saved_profiles";

export type SavedProfilePayload = {
  profileId: string;
  userId: string;
  name: string;
  phone: string;
  savedAt: string;
  unreadNotificationCount?: number;
};

function normalizePhone(phone: string | null | undefined) {
  return typeof phone === "string" ? phone.trim() : "";
}

function isSavedProfilePayload(value: unknown): value is SavedProfilePayload {
  if (!value || typeof value !== "object") return false;

  const profile = value as SavedProfilePayload;
  return (
    typeof profile.profileId === "string" &&
    typeof profile.userId === "string" &&
    typeof profile.name === "string" &&
    typeof profile.phone === "string" &&
    typeof profile.savedAt === "string"
  );
}

async function readSavedProfiles(): Promise<SavedProfilePayload[]> {
  const rawValue = await storage.getItem(SAVED_PROFILES_KEY);
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter(isSavedProfilePayload) : [];
  } catch {
    return [];
  }
}

async function writeSavedProfiles(profiles: SavedProfilePayload[]) {
  await storage.setItem(SAVED_PROFILES_KEY, JSON.stringify(profiles));
}

export async function getSavedProfiles() {
  return await readSavedProfiles();
}

export async function saveProfilePayload(profile: Profile, unreadNotificationCount?: number) {
  const phone = normalizePhone(profile.phone);
  if (!phone) return;
  const savedProfiles = await readSavedProfiles();
  const previousProfile = savedProfiles.find(
    (item) => item.profileId === profile.id || Boolean(item.phone && item.phone === phone)
  );

  const payload: SavedProfilePayload = {
    profileId: profile.id,
    userId: profile.user_id,
    name: profile.name?.trim() || phone,
    phone,
    savedAt: new Date().toISOString(),
    unreadNotificationCount:
      typeof unreadNotificationCount === "number"
        ? unreadNotificationCount
        : previousProfile?.unreadNotificationCount,
  };

  const nextProfiles = [
    payload,
    ...savedProfiles.filter((item) => {
      if (item.profileId === payload.profileId) return false;
      if (item.phone && item.phone === payload.phone) return false;
      return true;
    }),
  ];

  await writeSavedProfiles(nextProfiles);
}

export async function updateSavedProfileUnreadNotificationCount(
  profileId: string,
  unreadNotificationCount: number
) {
  const savedProfiles = await readSavedProfiles();
  const nextProfiles = savedProfiles.map((profile) =>
    profile.profileId === profileId
      ? {
          ...profile,
          unreadNotificationCount,
          savedAt: new Date().toISOString(),
        }
      : profile
  );

  await writeSavedProfiles(nextProfiles);
  return nextProfiles;
}
