import {
  createKVStorage,
  createSecureKVStorage,
} from "@/src/store/factory";
import { Database } from "@/src/types/database.types";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";
import { SupabaseStorage } from "./supabaseStorage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabasePublicUrl = url;

const env = process.env.EXPO_PUBLIC_ENV ?? "dev";
const storage = new SupabaseStorage(
  createSecureKVStorage(),
  `sb_${env}`,
  Platform.OS === "web" ? undefined : createKVStorage()
);

export const supabase : SupabaseClient<Database> = createClient<Database>(url, anon, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
