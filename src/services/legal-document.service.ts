import { RPC_FUNCTIONS } from "../db/functions";
import {
  COL_LEGAL_DOCUMENT,
  COL_LEGAL_DOCUMENT_SECTION,
  TB_LEGAL_DOCUMENT,
  TB_LEGAL_DOCUMENT_SECTION,
} from "../db/tables";
import { Row } from "../db/types";
import { getSession } from "../lib/supabase";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";

export const LEGAL_DOCUMENT_CODES = {
  privacyPolicy: "privacy_policy",
  termsConditions: "terms_conditions",
} as const;

export type LegalDocumentCode =
  (typeof LEGAL_DOCUMENT_CODES)[keyof typeof LEGAL_DOCUMENT_CODES];

export type LegalDocumentSection = {
  id: string;
  heading: string | null;
  body: string;
  sortOrder: number;
};

export type LegalDocument = {
  versionId: string | null;
  code: string;
  title: string;
  versionLabel: string | null;
  effectiveDate: string | null;
  sections: LegalDocumentSection[];
};

export type LegalAcceptanceDocument = {
  versionId: string;
  code: string;
  title: string;
  versionLabel: string;
  effectiveDate: string | null;
  accepted: boolean;
};

export type LegalAcceptanceState = {
  accepted: boolean;
  documents: LegalAcceptanceDocument[];
};

type LegalDocumentRow = Row<"legal_document">;
type LegalDocumentSectionRow = Row<"legal_document_section">;

function isMissingActiveLegalDocumentRpc(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as Record<string, unknown>;
  const code = typeof value.code === "string" ? value.code : "";
  const message = typeof value.message === "string" ? value.message : "";
  return (
    code === "PGRST202" ||
    (message.includes("get_active_legal_document") &&
      message.toLowerCase().includes("schema cache"))
  );
}

async function getActiveLegalDocumentFromTables(
  code: string
): Promise<
  { ok: true; data: LegalDocument | null } | { ok: false; error: AppError }
> {
  const documentResult = await supabase
    .from(TB_LEGAL_DOCUMENT)
    .select("code,title,version_label,effective_date,is_active,created_at,updated_at")
    .eq(COL_LEGAL_DOCUMENT.code, code)
    .eq(COL_LEGAL_DOCUMENT.is_active, true)
    .maybeSingle();

  if (documentResult.error) {
    return { ok: false, error: fromSupabaseError(documentResult.error) };
  }
  if (!documentResult.data) {
    return { ok: true, data: null };
  }

  const sectionResult = await supabase
    .from(TB_LEGAL_DOCUMENT_SECTION)
    .select("id,document_code,heading,body,sort_order,is_active,created_at,updated_at")
    .eq(COL_LEGAL_DOCUMENT_SECTION.document_code, code)
    .eq(COL_LEGAL_DOCUMENT_SECTION.is_active, true)
    .order(COL_LEGAL_DOCUMENT_SECTION.sort_order, { ascending: true })
    .order(COL_LEGAL_DOCUMENT_SECTION.created_at, { ascending: true });

  if (sectionResult.error) {
    return { ok: false, error: fromSupabaseError(sectionResult.error) };
  }

  const document = documentResult.data as LegalDocumentRow;
  const sections = ((sectionResult.data ?? []) as LegalDocumentSectionRow[]).map(
    (section) => ({
      id: section.id,
      heading: section.heading,
      body: section.body,
      sortOrder: section.sort_order,
    })
  );

  return {
    ok: true,
    data: {
      versionId: null,
      code: document.code,
      title: document.title,
      versionLabel: document.version_label,
      effectiveDate: document.effective_date,
      sections,
    },
  };
}

function parseLegalAcceptanceState(raw: unknown): LegalAcceptanceState {
  const value =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const documents = Array.isArray(value.documents)
    ? value.documents
        .map((document): LegalAcceptanceDocument | null => {
          if (!document || typeof document !== "object" || Array.isArray(document)) {
            return null;
          }
          const item = document as Record<string, unknown>;
          if (
            typeof item.version_id !== "string" ||
            typeof item.code !== "string" ||
            typeof item.title !== "string" ||
            typeof item.version_label !== "string"
          ) {
            return null;
          }
          return {
            versionId: item.version_id,
            code: item.code,
            title: item.title,
            versionLabel: item.version_label,
            effectiveDate:
              typeof item.effective_date === "string"
                ? item.effective_date
                : null,
            accepted: item.accepted === true,
          };
        })
        .filter((document): document is LegalAcceptanceDocument =>
          Boolean(document)
        )
    : [];

  return {
    accepted: value.accepted === true,
    documents,
  };
}

export async function getCurrentLegalAcceptanceState(): Promise<
  { ok: true; data: LegalAcceptanceState } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const result = await supabase.rpc(
    RPC_FUNCTIONS.GET_CURRENT_LEGAL_ACCEPTANCE_STATE
  );
  if (result.error) {
    return { ok: false, error: fromSupabaseError(result.error) };
  }

  return { ok: true, data: parseLegalAcceptanceState(result.data) };
}

export async function acceptCurrentLegalDocuments(): Promise<
  { ok: true } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const result = await supabase.rpc(
    RPC_FUNCTIONS.ACCEPT_CURRENT_LEGAL_DOCUMENTS,
    { p_source: "APP" }
  );
  if (result.error) {
    return { ok: false, error: fromSupabaseError(result.error) };
  }

  const value =
    result.data && typeof result.data === "object"
      ? (result.data as Record<string, unknown>)
      : null;
  if (value?.accepted !== true) {
    return { ok: false, error: fromAppError("unknown") };
  }
  return { ok: true };
}

export async function getActiveLegalDocument(
  code: string
): Promise<
  { ok: true; data: LegalDocument | null } | { ok: false; error: AppError }
> {
  const result = await supabase.rpc(
    RPC_FUNCTIONS.GET_ACTIVE_LEGAL_DOCUMENT,
    { p_code: code } as never
  );
  if (result.error) {
    if (isMissingActiveLegalDocumentRpc(result.error)) {
      return getActiveLegalDocumentFromTables(code);
    }
    return { ok: false, error: fromSupabaseError(result.error) };
  }
  if (!result.data) {
    return { ok: true, data: null };
  }

  const document =
    result.data && typeof result.data === "object" && !Array.isArray(result.data)
      ? result.data as Record<string, unknown>
      : null;
  if (
    !document ||
    typeof document.version_id !== "string" ||
    typeof document.code !== "string" ||
    typeof document.title !== "string"
  ) {
    return { ok: false, error: fromAppError("validation") };
  }

  const sections = (Array.isArray(document.sections) ? document.sections : [])
    .map((rawSection): LegalDocumentSection | null => {
      if (
        !rawSection ||
        typeof rawSection !== "object" ||
        Array.isArray(rawSection)
      ) {
        return null;
      }
      const section = rawSection as Record<string, unknown>;
      if (
        typeof section.id !== "string" ||
        typeof section.body !== "string" ||
        typeof section.sort_order !== "number"
      ) {
        return null;
      }
      return {
        id: section.id,
        heading: typeof section.heading === "string" ? section.heading : null,
        body: section.body,
        sortOrder: section.sort_order,
      };
    })
    .filter((section): section is LegalDocumentSection => section !== null);

  return {
    ok: true,
    data: {
      versionId: document.version_id,
      code: document.code,
      title: document.title,
      versionLabel:
        typeof document.version_label === "string"
          ? document.version_label
          : null,
      effectiveDate:
        typeof document.effective_date === "string"
          ? document.effective_date
          : null,
      sections,
    },
  };
}
