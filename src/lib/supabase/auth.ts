import { insertRoleToProfile } from "@/src/services/profile.role.service";
import { createProfile, getProfileByPhone, Profile } from "@/src/services/profile.service";
import { getRoleByName, Roles } from "@/src/services/role.service";
import { router } from "expo-router";
import { supabase } from "./client";
import { AppError, fromAppError } from "./errors";

export type AuthMethod = "sms";
export type AuthEvent = "SignIn" | "SignUp";

async function getLoggedInUserId(): Promise<{ ok: true; data: string } | { ok: false; error: AppError }> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };
  return { ok: true, data: session.user.id };
}

async function sendPhoneOtp(phone: string, event: AuthEvent) {
  const shouldCreateUser = event === "SignUp";
  const existingProfile = await getProfileByPhone(phone);
  if (shouldCreateUser && existingProfile) throw new Error("El número de teléfono ya está registrado.");
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: shouldCreateUser,
    },
  });
  if (error) throw error;
  return data;
}

async function VerifyPhoneOtpInternal(
  phone: string,
  token: string,
  userProfile?: Profile,
  isSeller?: boolean
) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) throw error;
  if (!userProfile) return data;
  await supabase.auth.refreshSession();
  const profileResult = await updateUserProfile(userProfile);
  if (profileResult.ok === false) throw new Error(profileResult.error.message);
  await addRoleToProfile(profileResult.data.id, isSeller);
  await supabase.auth.refreshSession();
  return data;
}

async function updateUserProfile(profileData: Profile) {
  const userId = await getLoggedInUserId();
  if (!userId.ok) throw new Error(userId.error.message);
  profileData.user_id = userId.data;
  return await createProfile(profileData);
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
  isSeller?: boolean
) {
  return await VerifyPhoneOtpInternal(phone, token, userProfile, isSeller);
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
  const { data: sub } = supabase.auth.onAuthStateChange(async (evt) => {
    const s = await getSession();
    cb(evt, !!s);
  });
  return () => sub.subscription.unsubscribe();
}

async function addRoleToProfile(id: string, isSeller?: boolean) {
  const role = await getRoleByName(isSeller ? Roles.SELLER : Roles.BUYER);
  if(role.ok === false) throw new Error(role.error.message);
  await insertRoleToProfile(id, role.data.id);
}
