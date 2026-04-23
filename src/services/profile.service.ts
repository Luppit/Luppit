import { Row } from "../db/types";
import { supabase } from "../lib/supabase";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";

export type Profile = Row<"profile">;
export type ProfileEmailSetupStatus = {
    email: string | null;
    emailOptIn: boolean;
    emailOptInAt: string | null;
    isComplete: boolean;
};

function normalizeProfileEmail(email: string) {
    return email.trim().toLowerCase();
}

function mapProfileEmailSetupStatus(profile: Profile | null): ProfileEmailSetupStatus {
    const email = typeof profile?.email === "string" ? profile.email.trim() : "";
    const emailOptIn = profile?.email_opt_in === true;
    const emailOptInAt =
        typeof profile?.email_opt_in_at === "string" && profile.email_opt_in_at.length > 0
            ? profile.email_opt_in_at
            : null;

    return {
        email: email || null,
        emailOptIn,
        emailOptInAt,
        isComplete: Boolean(email) && emailOptIn && emailOptInAt !== null,
    };
}

async function getCurrentAuthenticatedProfile(): Promise<
    { ok: true; data: Profile } | { ok: false; error: AppError }
> {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { ok: false, error: fromSupabaseError(error) };

    const userId = data.session?.user.id;
    if (!userId) {
        return { ok: false, error: fromAppError("auth") };
    }

    const profileResult = await getProfileByUserId(userId);
    if (profileResult?.ok === false) return { ok: false, error: profileResult.error };
    if (!profileResult || profileResult.ok !== true) {
        return { ok: false, error: fromAppError("not_found") };
    }

    return { ok: true, data: profileResult.data };
}

export async function createProfile(profile : Profile): Promise<{ok: true; data: Profile} | {ok: false; error: AppError}> {
    const { id: _omit, ...insertData } = profile;
    const { data, error } = await supabase
        .from("profile")
        .insert(insertData)
        .select()
        .single();
    if (error) return {ok: false, error: fromSupabaseError(error) };
    return { ok: true, data: data as Profile };
}

export async function getProfileByPhone(phone: string): Promise<{ok: true; data: Profile} | {ok: false; error: AppError} | null > {
    const { data, error } = await supabase
        .from("profile")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();
    if (error) return {ok: false, error: fromSupabaseError(error) };
    if (!data) return null;
    return { ok: true, data: data as Profile };
}

export async function getProfileByUserId(userId: string): Promise<{ok: true; data: Profile} | {ok: false; error: AppError} | null > {
    const { data, error } = await supabase
        .from("profile")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) return {ok: false, error: fromSupabaseError(error) };
    if (!data) return null;
    return { ok: true, data: data as Profile };
}

export function getProfileEmailSetupStatus(profile: Profile | null): ProfileEmailSetupStatus {
    return mapProfileEmailSetupStatus(profile);
}

export async function getCurrentProfileEmailSetupStatus(): Promise<
    { ok: true; data: ProfileEmailSetupStatus } | { ok: false; error: AppError }
> {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { ok: false, error: fromSupabaseError(error) };

    const userId = data.session?.user.id;
    if (!userId) {
        return {
            ok: true,
            data: mapProfileEmailSetupStatus(null),
        };
    }

    const profile = await getProfileByUserId(userId);
    if (profile?.ok === false) return { ok: false, error: profile.error };

    return {
        ok: true,
        data: mapProfileEmailSetupStatus(profile?.ok === true ? profile.data : null),
    };
}

type UpdateCurrentProfileEmailSetupInput = {
    email: string;
    emailOptIn: boolean;
};

export async function updateCurrentProfileEmailSetup({
    email,
    emailOptIn,
}: UpdateCurrentProfileEmailSetupInput): Promise<
    { ok: true; data: ProfileEmailSetupStatus } | { ok: false; error: AppError }
> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const normalizedEmail = normalizeProfileEmail(email);
    const payload = {
        email: normalizedEmail.length > 0 ? normalizedEmail : null,
        email_opt_in: emailOptIn,
        email_opt_in_at: emailOptIn ? new Date().toISOString() : null,
    };

    const { data: updatedProfile, error: updateError } = await supabase
        .from("profile")
        .update(payload)
        .eq("id", profileResult.data.id)
        .select("*")
        .single();

    if (updateError) return { ok: false, error: fromSupabaseError(updateError) };

    return {
        ok: true,
        data: mapProfileEmailSetupStatus(updatedProfile as Profile),
    };
}

type RequestCurrentProfileEmailSetupVerificationInput = {
    email: string;
};

async function sendCurrentProfileEmailSetupVerificationOtp(email: string): Promise<
    { ok: true; data: { email: string } } | { ok: false; error: AppError }
> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const normalizedEmail = normalizeProfileEmail(email);
    if (!normalizedEmail) {
        return { ok: false, error: fromAppError("validation") };
    }

    const rpcResult: any = await (supabase as any).rpc("send_email_verification_otp", {
        p_profile_id: profileResult.data.id,
        p_email: normalizedEmail,
    });

    if (rpcResult?.error) {
        return { ok: false, error: fromSupabaseError(rpcResult.error) };
    }

    return {
        ok: true,
        data: {
            email: normalizedEmail,
        },
    };
}

export async function requestCurrentProfileEmailSetupVerification({
    email,
}: RequestCurrentProfileEmailSetupVerificationInput): Promise<
    { ok: true; data: { email: string } } | { ok: false; error: AppError }
> {
    return await sendCurrentProfileEmailSetupVerificationOtp(email);
}

type ResendCurrentProfileEmailSetupVerificationInput = {
    email: string;
};

export async function resendCurrentProfileEmailSetupVerification({
    email,
}: ResendCurrentProfileEmailSetupVerificationInput): Promise<
    { ok: true; data: { email: string } } | { ok: false; error: AppError }
> {
    return await sendCurrentProfileEmailSetupVerificationOtp(email);
}

type VerifyCurrentProfileEmailSetupInput = {
    email: string;
    token: string;
    emailOptIn: boolean;
};

export async function verifyCurrentProfileEmailSetup({
    email,
    token,
    emailOptIn,
}: VerifyCurrentProfileEmailSetupInput): Promise<
    { ok: true; data: ProfileEmailSetupStatus } | { ok: false; error: AppError }
> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const normalizedEmail = normalizeProfileEmail(email);
    const normalizedToken = token.trim();

    if (!normalizedEmail || !normalizedToken) {
        return { ok: false, error: fromAppError("validation") };
    }

    const rpcResult: any = await (supabase as any).rpc("verify_email_verification_otp", {
        p_profile_id: profileResult.data.id,
        p_email: normalizedEmail,
        p_code: normalizedToken,
        p_email_opt_in: emailOptIn,
    });

    if (rpcResult?.error) {
        return { ok: false, error: fromSupabaseError(rpcResult.error) };
    }

    return await getCurrentProfileEmailSetupStatus();
}
