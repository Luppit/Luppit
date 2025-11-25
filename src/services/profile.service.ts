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