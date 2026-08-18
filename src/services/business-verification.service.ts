import type { SelectedFile } from "@/src/components/filePicker/FilePicker";
import { RPC_FUNCTIONS } from "@/src/db/functions";
import { supabase } from "@/src/lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "@/src/lib/supabase/errors";
import { STORAGE_BUCKETS } from "@/src/lib/supabase/storage";

export type BusinessVerificationStatus =
  | "PENDING"
  | "NEEDS_ACTION"
  | "APPROVED"
  | "REJECTED";

export type BusinessVerification = {
  applicationId: string | null;
  status: BusinessVerificationStatus | null;
  rnpNumber: string | null;
  safeMessage: string | null;
  submissionVersion: number;
  evidence: {
    id: string;
    name: string;
    mimeType: string;
    byteSize: number;
    submissionVersion: number;
    createdAt: string;
  }[];
};

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

const MAX_FILES = 5;
const MAX_BYTES = 5_000_000;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseVerification(value: unknown): BusinessVerification | null {
  const row = record(value);
  if (!row) return null;
  const status = row.status === null ? null
    : row.status === "PENDING" || row.status === "NEEDS_ACTION" ||
        row.status === "APPROVED" || row.status === "REJECTED"
    ? row.status
    : undefined;
  if (status === undefined) return null;
  const evidence = Array.isArray(row.evidence) ? row.evidence.map((item) => {
    const file = record(item);
    if (!file) return null;
    const id = nullableString(file.id);
    const name = nullableString(file.name);
    const mimeType = nullableString(file.mime_type);
    const createdAt = nullableString(file.created_at);
    if (!id || !name || !mimeType || !createdAt ||
      typeof file.byte_size !== "number" ||
      typeof file.submission_version !== "number") return null;
    return {
      id,
      name,
      mimeType,
      byteSize: file.byte_size,
      submissionVersion: file.submission_version,
      createdAt,
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null) : [];
  const submissionVersion = typeof row.submission_version === "number"
    ? row.submission_version
    : 0;
  return {
    applicationId: nullableString(row.application_id),
    status,
    rnpNumber: nullableString(row.rnp_number),
    safeMessage: nullableString(row.safe_message),
    submissionVersion,
    evidence,
  };
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    return (token === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function validateBytes(bytes: Uint8Array): { mimeType: string; extension: string } | null {
  if (bytes.byteLength < 5 || bytes.byteLength > MAX_BYTES) return null;
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 &&
    bytes[3] === 0x46 && bytes[4] === 0x2d) {
    return { mimeType: "application/pdf", extension: "pdf" };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, index) => bytes[index] === byte)) {
    return { mimeType: "image/png", extension: "png" };
  }
  return null;
}

async function functionError(error: unknown): Promise<AppError> {
  const context = record(error)?.context as { clone?: () => Response; json?: () => Promise<unknown> } | undefined;
  try {
    const response = typeof context?.clone === "function" ? context.clone() : context;
    const payload = response && typeof response.json === "function"
      ? record(await response.json())
      : null;
    if (payload && typeof payload.error_code === "string") {
      return fromSupabaseError({ code: payload.error_code, message: payload.error_code });
    }
  } catch {}
  return fromSupabaseError(error);
}

export async function getCurrentBusinessVerification(
  profileId: string,
): Promise<ServiceResult<BusinessVerification>> {
  const result = await supabase.rpc(
    RPC_FUNCTIONS.GET_CURRENT_BUSINESS_VERIFICATION,
    { p_profile_id: profileId } as never,
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  const parsed = parseVerification(result.data);
  return parsed ? { ok: true, data: parsed } : { ok: false, error: fromAppError("validation") };
}

export async function submitCurrentBusinessVerification(input: {
  userId: string;
  profileId: string;
  rnpNumber: string;
  files: SelectedFile[];
}): Promise<ServiceResult<BusinessVerification>> {
  const rnpNumber = input.rnpNumber.trim();
  if (!rnpNumber || input.files.length < 1 || input.files.length > MAX_FILES) {
    return { ok: false, error: fromAppError("validation") };
  }

  const uploads: { storagePath: string; originalFileName: string }[] = [];
  try {
    for (const file of input.files) {
      if (typeof file.size === "number" && file.size > MAX_BYTES) {
        throw fromAppError("validation");
      }
      const response = await fetch(file.uri);
      const body = await response.arrayBuffer();
      const validated = validateBytes(new Uint8Array(body));
      if (!validated) throw fromAppError("validation");
      const storagePath = `${input.userId}/${input.profileId}/${uuid()}.${validated.extension}`;
      const uploaded = await supabase.storage
        .from(STORAGE_BUCKETS.businessVerificationEvidence)
        .upload(storagePath, body, { contentType: validated.mimeType, upsert: false });
      if (uploaded.error) throw fromSupabaseError(uploaded.error);
      uploads.push({
        storagePath,
        originalFileName: file.name?.trim() || `documento.${validated.extension}`,
      });
    }

    const submitted = await supabase.functions.invoke("submit-business-verification", {
      body: {
        profileId: input.profileId,
        rnpNumber,
        evidence: uploads,
      },
    });
    if (submitted.error) throw await functionError(submitted.error);
    return await getCurrentBusinessVerification(input.profileId);
  } catch (error) {
    if (uploads.length > 0) {
      await supabase.storage
        .from(STORAGE_BUCKETS.businessVerificationEvidence)
        .remove(uploads.map((item) => item.storagePath));
    }
    return {
      ok: false,
      error: record(error)?.type ? error as AppError : fromAppError("network"),
    };
  }
}
