import {
  abortProfileScopedRequests,
  createCurrentUserProfile,
  listCurrentUserProfiles,
  requestActiveProfileRefresh,
  setInitialProfileBootstrapPending,
  setCurrentProfileSummary,
  setCurrentUserProfileCount,
} from "@/src/services/active.profile.service";
import { RPC_FUNCTIONS } from "@/src/db/functions";
import {
  beginCurrentUserBuyerOnboarding,
  beginCurrentUserSellerOnboarding,
  getCurrentAccountOnboarding,
} from "@/src/services/identity-verification.service";
import { continueSignupAfterVerification } from "@/src/services/identity-verification.helpers";
import { router } from "expo-router";
import { supabase } from "./client";
import { fromAppError, fromSupabaseError } from "./errors";
import { unregisterCurrentPushDevice } from "@/src/services/push-notification.service";

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
export class PostPhoneVerificationSetupError extends InitialProfileSetupError {}

function throwLocalizedSupabaseError(error: unknown): never {
  throw new Error(fromSupabaseError(error).message);
}

async function sendPhoneOtp(phone: string, event: AuthEvent) {
  const shouldCreateUser = event === "SignUp";
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: shouldCreateUser,
    },
  });
  if (error) throwLocalizedSupabaseError(error);
  return data;
}

async function VerifyPhoneOtpInternal(
  phone: string,
  token: string,
  initialProfile?: InitialProfileInput,
  suppressProfileRefresh = false
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
      if (!suppressProfileRefresh) await requestActiveProfileRefresh();
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

export async function verifyBuyerPhoneOtp(
  phone: string,
  token: string,
  legalAccepted: boolean
) {
  return await verifySignupPhoneOtp(phone, token, legalAccepted, "buyer");
}

export async function verifySellerPhoneOtp(
  phone: string,
  token: string,
  legalAccepted: boolean
) {
  return await verifySignupPhoneOtp(phone, token, legalAccepted, "seller");
}

async function verifySignupPhoneOtp(
  phone: string,
  token: string,
  legalAccepted: boolean,
  intendedRole: "buyer" | "seller",
) {
  if (!legalAccepted) {
    throw new InitialProfileSetupError(
      "Debes aceptar los documentos legales para crear tu cuenta."
    );
  }

  let didVerifySession = false;
  setInitialProfileBootstrapPending(true);
  try {
    const data = await VerifyPhoneOtpInternal(phone, token, undefined, true);
    didVerifySession = true;

    try {
      const legalAcceptance = await supabase.rpc(
        RPC_FUNCTIONS.ACCEPT_CURRENT_LEGAL_DOCUMENTS,
        { p_source: "APP" }
      );
      if (legalAcceptance.error) {
        throw new Error(
          "No pudimos guardar la aceptación de los documentos legales."
        );
      }

      await continueSignupAfterVerification(intendedRole, {
        getProfileCount: async () => {
          const profiles = await listCurrentUserProfiles();
          if (!profiles.ok) throw new Error(profiles.error.message);
          return profiles.data.length;
        },
        getOnboarding: async () => {
          const onboarding = await getCurrentAccountOnboarding();
          if (!onboarding.ok) throw new Error(onboarding.error.message);
          return onboarding.data;
        },
        beginOnboarding: async (role) => {
          const started = role === "buyer"
            ? await beginCurrentUserBuyerOnboarding()
            : await beginCurrentUserSellerOnboarding();
          if (!started.ok) throw new Error(started.error.message);
        },
      });
      return data;
    } catch (error) {
      throw new PostPhoneVerificationSetupError(
        error instanceof Error ? error.message : fromAppError("unknown").message
      );
    }
  } finally {
    setInitialProfileBootstrapPending(false);
    if (didVerifySession) {
      try {
        await requestActiveProfileRefresh();
      } catch {
        // Do not turn a completed phone verification into an invalid-code error.
      }
    }
  }
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
  try {
    await unregisterCurrentPushDevice();
  } catch {
    // Signing out must still succeed if the device is offline.
  }
  await supabase.auth.signOut({ scope: "local" });
  setCurrentProfileSummary(null);
  setCurrentUserProfileCount(0);
  router.replace("/(auth)/auth");
}

export async function signOut() {
  abortProfileScopedRequests();
  try {
    await unregisterCurrentPushDevice();
  } catch {
    // Signing out must still succeed if the device is offline.
  }
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
