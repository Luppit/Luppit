import { createKVStorage } from "@/src/store/factory";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import { SupabaseStorage } from "./supabaseStorage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const baseStorage = createKVStorage();

const env = process.env.EXPO_PUBLIC_ENV ?? "dev";
const storage = new SupabaseStorage(baseStorage, `sb_${env}`);

export const supabase = createClient(url, anon, {
  auth: {
    storage: storage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});