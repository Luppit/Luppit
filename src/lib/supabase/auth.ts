import { insertRoleToProfile } from "@/src/services/profile.role.service";
import {
  createProfile,
  getProfileByPhone,
  getProfileByUserId,
  Profile,
} from "@/src/services/profile.service";
import { getRoleByName, Roles } from "@/src/services/role.service";
import { router } from "expo-router";
import { supabase } from "./client";
import { AppError, fromAppError } from "./errors";

export type AuthMethod = "sms";
export type AuthEvent = "SignIn" | "SignUp";

async function sendPhoneOtp(phone: string, event: AuthEvent) {
  const shouldCreateUser = event === "SignUp";
  const isRegistered = shouldCreateUser
    ? await isPhoneNumberRegistered(phone)
    : false;
  if (isRegistered) {
    throw new Error("El número de teléfono ya está registrado.");
  }

  const existingProfile = await getProfileByPhone(phone);
  if (existingProfile?.ok === false) throw new Error(existingProfile.error.message);
  if (shouldCreateUser && existingProfile?.ok === true) {
    throw new Error("El número de teléfono ya está registrado.");
  }

  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: shouldCreateUser,
    },
  });
  if (error) throw error;
  return data;
}

async function isPhoneNumberRegistered(phone: string) {
  const { data, error } = await (supabase as any).rpc(
    "phone_number_is_registered",
    { p_phone: phone }
  );
  if (error) throw error;
  return data === true;
}

async function VerifyPhoneOtpInternal(
  phone: string,
  token: string,
  userProfile?: Profile,
  isSeller?: boolean,
  onProfileCreated?: (profile: Profile) => Promise<void>
) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) throw error;
  if (!userProfile) return data;
  const verifiedUserId = data.user?.id ?? data.session?.user.id;
  if (!verifiedUserId) throw new Error(fromAppError("auth").message);
  const profileResult = await createVerifiedUserProfile(userProfile, verifiedUserId);
  if (profileResult.ok === false) throw new Error(profileResult.error.message);
  await addRoleToProfile(profileResult.data.id, isSeller);
  if (onProfileCreated) {
    await onProfileCreated(profileResult.data);
  }
  return data;
}

async function createVerifiedUserProfile(
  profileData: Profile,
  userId: string
): Promise<{ ok: true; data: Profile } | { ok: false; error: AppError }> {
  const existingProfile = await getProfileByUserId(userId);
  if (existingProfile?.ok === false) return existingProfile;
  if (existingProfile?.ok === true) {
    return {
      ok: false,
      error: {
        type: "validation",
        message: "El número de teléfono ya está registrado.",
      } satisfies AppError,
    };
  }

  const profileResult = await createProfile({ ...profileData, user_id: userId });
  if (profileResult.ok === false && profileResult.error.code === "23505") {
    return {
      ok: false,
      error: {
        type: "validation",
        message: "El número de teléfono ya está registrado.",
        code: profileResult.error.code,
      } satisfies AppError,
    };
  }

  return profileResult;
}

export async function signInWithPhoneOtp(phone: string) {
  const existingProfile = await getProfileByPhone(phone);
  if(existingProfile?.ok === false) throw new Error(existingProfile.error.message);
  return await sendPhoneOtp(phone, "SignIn");
}

export async function signUpWithPhoneOtp(phone: string) {
  return await sendPhoneOtp(phone, "SignUp");
}

export async function verifyPhoneOtp(
  phone: string,
  token: string,
  userProfile?: Profile,
  isSeller?: boolean,
  onProfileCreated?: (profile: Profile) => Promise<void>
) {
  return await VerifyPhoneOtpInternal(
    phone,
    token,
    userProfile,
    isSeller,
    onProfileCreated
  );
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export function signOut() {
  supabase.auth.signOut();
  router.replace("/(auth)/auth");
}

export function onAuthChange(cb: (event: string, hasSession: boolean) => void) {
  const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
    cb(evt, !!session);
  });
  return () => sub.subscription.unsubscribe();
}

async function addRoleToProfile(id: string, isSeller?: boolean) {
  const role = await getRoleByName(isSeller ? Roles.SELLER : Roles.BUYER);
  if(role.ok === false) throw new Error(role.error.message);
  await insertRoleToProfile(id, role.data.id);
}
