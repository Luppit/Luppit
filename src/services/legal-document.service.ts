import {
  COL_LEGAL_DOCUMENT,
  COL_LEGAL_DOCUMENT_SECTION,
  TB_LEGAL_DOCUMENT,
  TB_LEGAL_DOCUMENT_SECTION,
} from "../db/tables";
import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

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
