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
import { fromAppError, fromSupabaseError } from "./errors";

export type AuthMethod = "sms";
export type AuthEvent = "SignIn" | "SignUp";
export type InitialProfileInput = {
  name: string;
  idDocument: string;
  role: "buyer" | "seller";
  businessName?: string | null;
  businessIdDocument?: string | null;
  legalAccepted?: boolean;
};

export class InitialProfileSetupError extends Error {}

function throwLocalizedSupabaseError(error: unknown): never {
  throw new Error(fromSupabaseError(error).message);
}

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
  if (error) throwLocalizedSupabaseError(error);
  return data;
}

async function isPhoneNumberRegistered(phone: string) {
  const { data, error } = await supabase.rpc(
    RPC_FUNCTIONS.PHONE_NUMBER_IS_REGISTERED,
    { p_phone: phone }
  );
  if (error) throwLocalizedSupabaseError(error);
  return data === true;
}

async function VerifyPhoneOtpInternal(
  phone: string,
  token: string,
  initialProfile?: InitialProfileInput
) {
  let didVerifySession = false;
  let preferredProfileId: string | null = null;
  if (initialProfile) setInitialProfileBootstrapPending(true);
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (error) throwLocalizedSupabaseError(error);
    didVerifySession = true;
    if (!initialProfile) {
      await requestActiveProfileRefresh();
      return data;
    }
    if (!initialProfile.legalAccepted) {
      throw new InitialProfileSetupError(
        "Debes aceptar los documentos legales para crear tu cuenta."
      );
    }
    const verifiedUserId = data.user?.id ?? data.session?.user.id;
    if (!verifiedUserId) throw new Error(fromAppError("auth").message);
    const legalAcceptanceResult = await supabase.rpc(
      RPC_FUNCTIONS.ACCEPT_CURRENT_LEGAL_DOCUMENTS,
      { p_source: "APP" }
    );
    if (legalAcceptanceResult.error) {
      throw new InitialProfileSetupError(
        "No pudimos guardar la aceptación de los documentos legales."
      );
    }
    const profileResult = await createCurrentUserProfile({
      name: initialProfile.name,
      idDocument: initialProfile.idDocument,
      role: initialProfile.role,
      businessName: initialProfile.businessName,
      businessIdDocument: initialProfile.businessIdDocument,
    });
    if (!profileResult.ok) {
      throw new InitialProfileSetupError(profileResult.error.message);
    }
    preferredProfileId = profileResult.data.id;
    return data;
  } finally {
    if (initialProfile) {
      setInitialProfileBootstrapPending(false);
      if (didVerifySession) {
        await requestActiveProfileRefresh(preferredProfileId);
      }
    }
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

export async function requestDeletionReauthenticationOtp(phone: string) {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) throw new Error(fromAppError("auth").message);

  const normalizedPhone = phone.trim();
  if (!normalizedPhone) throw new Error("No encontramos el teléfono de acceso.");

  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizedPhone,
    options: { shouldCreateUser: false },
  });
  if (error) throwLocalizedSupabaseError(error);

  return { phone: normalizedPhone, userId };
}

export async function verifyDeletionReauthenticationOtp(
  phone: string,
  token: string,
  expectedUserId: string
) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phone.trim(),
    token: token.trim(),
    type: "sms",
  });
  if (error) throwLocalizedSupabaseError(error);

  const verifiedUserId = data.user?.id ?? data.session?.user.id;
  if (!verifiedUserId || verifiedUserId !== expectedUserId) {
    await supabase.auth.signOut({ scope: "local" });
    throw new Error("No pudimos verificar la cuenta correcta.");
  }

  return data;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signOutLocally() {
  abortProfileScopedRequests();
  await supabase.auth.signOut({ scope: "local" });
  setCurrentProfileSummary(null);
  setCurrentUserProfileCount(0);
  router.replace("/(auth)/auth");
}

export async function signOut() {
  abortProfileScopedRequests();
  const { error } = await supabase.auth.signOut();
  if (error) throwLocalizedSupabaseError(error);
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
