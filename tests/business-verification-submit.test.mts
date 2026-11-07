import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type {
  getCurrentBusinessVerification,
  submitCurrentBusinessVerification,
} from "../src/services/business-verification.service.ts";

const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
const pdfBytes = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF");
const evidenceFile = { uri: "file:///test-evidence.pdf", name: " prueba.pdf ", isImage: false };
const input = { userId: "audit-user", profileId: "audit-seller", files: [evidenceFile] };

function createService() {
  const fetches: string[] = [];
  const uploads: { bucket: string; path: string; bytes: ArrayBuffer; options: Record<string, unknown> }[] = [];
  const removals: { bucket: string; paths: string[] }[] = [];
  const invocations: { name: string; options: { body: Record<string, unknown> } }[] = [];
  const reads: { name: string; args: Record<string, unknown> }[] = [];
  let invocationError: unknown = null;
  let responseData: unknown = {
    application_id: "application-1", status: "PENDING", safe_message: null,
    submission_version: 1, evidence: [{
      id: "evidence-1", name: "prueba.pdf", mime_type: "application/pdf",
      byte_size: pdfBytes.byteLength, submission_version: 1, created_at: "2026-11-06T12:00:00Z",
    }],
  };
  let fileBytes = pdfBytes;
  const modules: Record<string, unknown> = {
    "@/src/db/functions": { RPC_FUNCTIONS: { GET_CURRENT_BUSINESS_VERIFICATION: "get_current_business_verification" } },
    "@/src/lib/supabase/storage": { STORAGE_BUCKETS: { businessVerificationEvidence: "business-verification-evidence" } },
    "@/src/lib/supabase/errors": {
      fromAppError: (type: string) => ({ type, message: `Test ${type} error` }),
      fromSupabaseError: (error: { code?: string; message?: string }) => ({
        type: "server", code: error.code, message: error.message ?? "Test server error",
      }),
    },
    "./app.config.service": {
      APP_CONFIG_KEYS: { businessVerificationReviewEstimate: "business_verification_review_estimate" },
      getAppConfigValue: async () => ({ ok: true, data: "3 días hábiles" }),
    },
    "@/src/lib/supabase/client": {
      supabase: {
        storage: { from: (bucket: string) => ({
          upload: async (path: string, bytes: ArrayBuffer, options: Record<string, unknown>) => {
            uploads.push({ bucket, path, bytes, options });
            return { error: null };
          },
          remove: async (paths: string[]) => {
            removals.push({ bucket, paths });
            return { error: null };
          },
        }) },
        functions: { invoke: async (name: string, options: { body: Record<string, unknown> }) => {
          invocations.push({ name, options });
          return { error: invocationError };
        } },
        rpc: async (name: string, args: Record<string, unknown>) => {
          reads.push({ name, args });
          return { data: responseData, error: null };
        },
      },
    },
  };
  const source = readFileSync(new URL("../src/services/business-verification.service.ts", import.meta.url), "utf8");
  const exports = {} as {
    submitCurrentBusinessVerification: typeof submitCurrentBusinessVerification;
    getCurrentBusinessVerification: typeof getCurrentBusinessVerification;
  };
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, Uint8Array,
    require(name: string) { assert.ok(name in modules, `Unmocked import: ${name}`); return modules[name]; },
    fetch: async (uri: string) => {
      fetches.push(uri);
      return { arrayBuffer: async () => fileBytes.buffer.slice(fileBytes.byteOffset, fileBytes.byteOffset + fileBytes.byteLength) };
    },
  });
  return {
    submit: exports.submitCurrentBusinessVerification,
    get: exports.getCurrentBusinessVerification,
    fetches, uploads, removals, invocations, reads,
    failSubmission(error: unknown) { invocationError = error; },
    setStatusData(data: unknown) { responseData = data; },
    setFileBytes(bytes: Uint8Array) { fileBytes = new Uint8Array(bytes); },
  };
}

test("a document alone submits evidence and reads the authoritative business status", async () => {
  const service = createService();
  const result = await service.submit(input);
  assert.equal(result.ok, true);
  assert.deepEqual(service.fetches, [evidenceFile.uri]);
  assert.equal(service.uploads.length, 1);
  const uploaded = service.uploads[0];
  assert.equal(uploaded.bucket, "business-verification-evidence");
  assert.match(uploaded.path, /^audit-user\/audit-seller\/[0-9a-f-]{36}\.pdf$/);
  assert.deepEqual(plain(uploaded.options), { contentType: "application/pdf", upsert: false });
  assert.deepEqual(new Uint8Array(uploaded.bytes), pdfBytes);
  assert.deepEqual(plain(service.invocations), [{
    name: "submit-business-verification",
    options: { body: {
      profileId: input.profileId,
      evidence: [{ storagePath: uploaded.path, originalFileName: "prueba.pdf" }],
    } },
  }]);
  assert.deepEqual(plain(service.reads), [{
    name: "get_current_business_verification", args: { p_profile_id: input.profileId },
  }]);
  assert.equal(service.removals.length, 0);
  if (result.ok) {
    assert.equal(result.data.status, "PENDING");
    assert.equal(result.data.evidence[0].name, "prueba.pdf");
  }
});

test("empty or excess evidence is rejected before reading files or uploading", async () => {
  for (const files of [[], Array.from({ length: 6 }, () => evidenceFile)]) {
    const service = createService();
    const result = await service.submit({ ...input, files });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.type, "validation");
    assert.equal(service.fetches.length, 0);
    assert.equal(service.uploads.length, 0);
    assert.equal(service.invocations.length, 0);
    assert.equal(service.reads.length, 0);
  }
});

test("a failed submission removes its staged evidence and preserves the backend failure", async () => {
  const service = createService();
  service.failSubmission({ context: { json: async () => ({ error_code: "evidence_rejected" }) } });
  const result = await service.submit(input);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "evidence_rejected");
  assert.equal(service.invocations.length, 1);
  assert.deepEqual(plain(service.removals), [{
    bucket: "business-verification-evidence", paths: [service.uploads[0].path],
  }]);
  assert.equal(service.reads.length, 0);
});

test("invalid document bytes never reach storage or the submission endpoint", async () => {
  const service = createService();
  service.setFileBytes(new TextEncoder().encode("This is plain text, not a supported document."));
  assert.equal((await service.submit(input)).ok, false);
  assert.equal(service.uploads.length, 0);
  assert.equal(service.invocations.length, 0);
});

test("status normalization accepts evidence-only responses and ignores obsolete server extras", async () => {
  const service = createService();
  service.setStatusData({
    application_id: "application-1", status: "APPROVED", safe_message: " Aprobado ",
    submission_version: 2, evidence: [], legacy_certificate_number: "obsolete", reviewer_private_data: "private",
  });
  const result = await service.get(input.profileId);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(plain(result.data), {
    applicationId: "application-1", status: "APPROVED", safeMessage: "Aprobado",
    submissionVersion: 2, evidence: [],
  });
});
