import { getCurrentProfileResult } from "@/src/services/active.profile.service";
import { RPC_FUNCTIONS } from "@/src/db/functions";
import { supabase } from "@/src/lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "@/src/lib/supabase/errors";

export type SafetyBlockListItem = {
  id: string;
  counterpartType: "BUYER" | "BUSINESS";
  counterpartId: string;
  counterpartLabel: string;
  createdAt: string;
};

function parseSafetyBlocks(raw: unknown): SafetyBlockListItem[] {
  const value =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  if (!Array.isArray(value.blocks)) return [];

  return value.blocks
    .map((block): SafetyBlockListItem | null => {
      if (!block || typeof block !== "object" || Array.isArray(block)) return null;
      const item = block as Record<string, unknown>;
      if (
        typeof item.id !== "string" ||
        (item.counterpart_type !== "BUYER" &&
          item.counterpart_type !== "BUSINESS") ||
        typeof item.counterpart_id !== "string" ||
        typeof item.counterpart_label !== "string" ||
        typeof item.created_at !== "string"
      ) {
        return null;
      }

      return {
        id: item.id,
        counterpartType: item.counterpart_type,
        counterpartId: item.counterpart_id,
        counterpartLabel: item.counterpart_label,
        createdAt: item.created_at,
      };
    })
    .filter((block): block is SafetyBlockListItem => Boolean(block));
}

export async function getCurrentSafetyBlocks(): Promise<
  { ok: true; data: SafetyBlockListItem[] } | { ok: false; error: AppError }
> {
  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const result = await supabase.rpc(RPC_FUNCTIONS.GET_CURRENT_SAFETY_BLOCKS, {
    p_profile_id: profile.data.id,
  });
  if (result.error) {
    return { ok: false, error: fromSupabaseError(result.error) };
  }

  return { ok: true, data: parseSafetyBlocks(result.data) };
}

export async function unblockSafetyBlock(
  blockId: string
): Promise<{ ok: true } | { ok: false; error: AppError }> {
  if (!blockId) return { ok: false, error: fromAppError("validation") };

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const result = await supabase.rpc(RPC_FUNCTIONS.UNBLOCK_SAFETY_BLOCK, {
    p_profile_id: profile.data.id,
    p_block_id: blockId,
  });
  if (result.error) {
    return { ok: false, error: fromSupabaseError(result.error) };
  }

  return { ok: true };
}
