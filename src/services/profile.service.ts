import { Row } from "../db/types";
import { supabase } from "../lib/supabase";

export type Profile = Row<"profile">;

export async function createProfile(profile : Profile): Promise<Profile> {
    const { id: _omit, ...insertData } = profile;
    const { data, error } = await supabase
        .from("profile")
        .insert(insertData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getProfileByPhone(phone: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from("profile")
        .select("*")
        .eq("phone", phone)
        .single();
    if (error){
        if (error.code === "PGRST116") {
            return null;
        }
        throw error;
    };
    return data;
}