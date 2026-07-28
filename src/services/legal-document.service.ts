import {
  COL_LEGAL_DOCUMENT,
  COL_LEGAL_DOCUMENT_SECTION,
  TB_LEGAL_DOCUMENT,
  TB_LEGAL_DOCUMENT_SECTION,
} from "../db/tables";
import { RPC_FUNCTIONS } from "../db/functions";
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

type LegalDocumentRow = Row<"legal_document">;
type LegalDocumentSectionRow = Row<"legal_document_section">;

export type LegalDocumentSection = {
  id: string;
  heading: string | null;
  body: string;
  sortOrder: number;
};

export type LegalDocument = {
  code: string;
  title: string;
  versionLabel: string | null;
  effectiveDate: string | null;
  sections: LegalDocumentSection[];
};

export type LegalAcceptanceDocument = {
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
            typeof item.code !== "string" ||
            typeof item.title !== "string" ||
            typeof item.version_label !== "string"
          ) {
            return null;
          }
          return {
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
      code: document.code,
      title: document.title,
      versionLabel: document.version_label,
      effectiveDate: document.effective_date,
      sections,
    },
  };
}
