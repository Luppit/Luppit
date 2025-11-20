import { insertRoleToProfile } from "@/src/services/profile.role.service";
import { createProfile, Profile } from "@/src/services/profile.service";
import { getRoleByName, Roles } from "@/src/services/role.service";
import { supabase } from "./client";

export type AuthMethod = "sms";
export type AuthEvent = "SignIn" | "SignUp";

async function getLoggedInUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user.id) throw new Error("No logged in user");
  return session.user.id;
}

async function sendPhoneOtp(phone: string, event: AuthEvent) {
  const shouldCreateUser = event === "SignUp";
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
  await updateUserProfile(userProfile)
    .then(async (data: Profile) => {
      await addRoleToProfile(data.id, isSeller);
      await supabase.auth.refreshSession();
    })
    .catch((err) => {
      throw err;
    });
  return data;
}

async function updateUserProfile(profileData: Profile) {
  const userId = await getLoggedInUserId();
  profileData.user_id = userId;
  return await createProfile(profileData);
}

export async function signInWithPhoneOtp(phone: string) {
  return await sendPhoneOtp(phone, "SignIn");
}

export async function signUpWithPhoneOtp(phone: string) {
  return await sendPhoneOtp(phone, "SignUp");
}

export async function verifyPhoneOtp(
  phone: string,
  token: string,
  userProfile: Profile,
  isSeller?: boolean
) {
  return await VerifyPhoneOtpInternal(phone, token, userProfile, isSeller);
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
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
  if (!role) throw new Error("Role not found");
  await insertRoleToProfile(id, role.id);
}