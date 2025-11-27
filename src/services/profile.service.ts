import { Row } from "../db/types";
import { supabase } from "../lib/supabase";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type Profile = Row<"profile">;

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
        .single();
    if (error) return {ok: false, error: fromSupabaseError(error) };
    return { ok: true, data: data as Profile };
}