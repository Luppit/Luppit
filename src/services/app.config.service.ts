import { COL_APP_CONFIG, TB_APP_CONFIG } from "../db/tables";
import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export const APP_CONFIG_KEYS = {
  accountDeletionUrl: "account_deletion_url",
  privacyPolicyUrl: "privacy_policy_url",
  supportEmail: "support_email",
  supportUrl: "support_url",
  termsUrl: "terms_url",
} as const;

export type AppConfigKey =
  (typeof APP_CONFIG_KEYS)[keyof typeof APP_CONFIG_KEYS];

type AppConfigRow = Row<"app_config">;
type AppConfigResult =
  | { ok: true; data: string }
  | { ok: false; error: AppError };

const pendingRequests = new Map<AppConfigKey, Promise<AppConfigResult>>();

async function loadAppConfigValue(key: AppConfigKey): Promise<AppConfigResult> {
  const { data, error } = await supabase
    .from(TB_APP_CONFIG)
    .select(`${COL_APP_CONFIG.key},${COL_APP_CONFIG.value}`)
    .eq(COL_APP_CONFIG.key, key)
    .maybeSingle();

  if (error) return { ok: false, error: fromSupabaseError(error) };

  const row = data as Pick<AppConfigRow, "key" | "value"> | null;
  const value = row?.value.trim();
  if (!value) {
    return {
      ok: false,
      error: {
        type: "not_found",
        message: "No se encontró la configuración solicitada.",
      },
    };
  }

  return { ok: true, data: value };
}

export function getAppConfigValue(key: AppConfigKey): Promise<AppConfigResult> {
  const pendingRequest = pendingRequests.get(key);
  if (pendingRequest) return pendingRequest;

  const request = loadAppConfigValue(key).then((result) => {
    pendingRequests.delete(key);
    return result;
  });

  pendingRequests.set(key, request);
  return request;
}
