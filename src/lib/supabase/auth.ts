import {
  abortProfileScopedRequests,
  createCurrentUserProfile,
  requestActiveProfileRefresh,
  setInitialProfileBootstrapPending,
  setCurrentProfileSummary,
  setCurrentUserProfileCount,
} from "@/src/services/active.profile.service";
import { RPC_FUNCTIONS } from "@/src/db/functions";
import { router } from "expo-router";
import { supabase } from "./client";
import { fromAppError } from "./errors";

export type AuthMethod = "sms";
export type AuthEvent = "SignIn" | "SignUp";
export type InitialProfileInput = {
  name: string;
  idDocument: string;
  role: "buyer" | "seller";
  businessName?: string | null;
  businessIdDocument?: string | null;
};

export class InitialProfileSetupError extends Error {}

async function sendPhoneOtp(phone: string, event: AuthEvent) {
  const shouldCreateUser = event === "SignUp";
  const isRegistered = shouldCreateUser
    ? await isPhoneNumberRegistered(phone)
    : false;
  if (isRegistered) {
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
  const { data, error } = await supabase.rpc(
    RPC_FUNCTIONS.PHONE_NUMBER_IS_REGISTERED,
    { p_phone: phone }
  );
  if (error) throw error;
  return data === true;
}

async function VerifyPhoneOtpInternal(
  phone: string,
  token: string,
  initialProfile?: InitialProfileInput
) {
  if (initialProfile) setInitialProfileBootstrapPending(true);
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (error) throw error;
    if (!initialProfile) {
      await requestActiveProfileRefresh();
      return data;
    }
    const verifiedUserId = data.user?.id ?? data.session?.user.id;
    if (!verifiedUserId) throw new Error(fromAppError("auth").message);
    const profileResult = await createCurrentUserProfile({
      name: initialProfile.name,
      idDocument: initialProfile.idDocument,
      role: initialProfile.role,
      businessName: initialProfile.businessName,
      businessIdDocument: initialProfile.businessIdDocument,
    });
    if (!profileResult.ok) {
      await requestActiveProfileRefresh();
      throw new InitialProfileSetupError(profileResult.error.message);
    }
    await requestActiveProfileRefresh(profileResult.data.id);
    return data;
  } finally {
    if (initialProfile) setInitialProfileBootstrapPending(false);
  }
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
  initialProfile?: InitialProfileInput
) {
  return await VerifyPhoneOtpInternal(
    phone,
    token,
    initialProfile
  );
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signOut() {
  abortProfileScopedRequests();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  setCurrentProfileSummary(null);
  setCurrentUserProfileCount(0);
  router.replace("/(auth)/auth");
}

export function onAuthChange(cb: (event: string, hasSession: boolean) => void) {
  const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
    cb(evt, !!session);
  });
  return () => sub.subscription.unsubscribe();
}
