import assert from "node:assert/strict";
import test from "node:test";
import { parseSellerBusinessSetup } from "../src/services/seller.business.setup.helpers.ts";
import { fromSupabaseError } from "../src/lib/supabase/errors.ts";

function setup(completed = 2) {
  return {
    business_id: "business", commercial_name: "Negocio", location_id: null,
    completed_count: completed, total_count: 6, is_complete: completed === 6,
    steps: ["email", "categories", "commercial_name", "location", "photo", "notifications"]
      .map((code, index) => ({ code, label: code, icon: "mail", action_label: code,
        is_complete: index < completed, can_edit: true, description: null })),
  };
}

test("keeps the server's ordered checklist, completion and membership permissions", () => {
  const raw = setup();
  raw.steps[2].can_edit = false;
  raw.steps.reverse();
  const parsed = parseSellerBusinessSetup(raw);
  assert.equal(parsed?.completedCount, 2);
  assert.equal(parsed?.isComplete, false);
  assert.equal(parsed?.steps[0].code, "notifications");
  assert.equal(parsed?.steps.find((step) => step.code === "commercial_name")?.canEdit, false);
});

test("requires the notification step even when every saved business field is complete", () => {
  assert.equal(parseSellerBusinessSetup(setup(5))?.isComplete, false);
  assert.equal(parseSellerBusinessSetup(setup(6))?.isComplete, true);
});

test("rejects incomplete, duplicate, unknown and inconsistent readiness responses", () => {
  assert.equal(parseSellerBusinessSetup(null), null);
  const missing = setup();
  missing.steps.pop();
  assert.equal(parseSellerBusinessSetup(missing), null);
  const duplicate = setup();
  duplicate.steps[5].code = "email";
  assert.equal(parseSellerBusinessSetup(duplicate), null);
  const unknown = setup();
  unknown.steps[5].code = "unknown";
  assert.equal(parseSellerBusinessSetup(unknown), null);
  assert.equal(parseSellerBusinessSetup({ ...setup(), is_complete: true }), null);
  assert.equal(parseSellerBusinessSetup({ ...setup(), completed_count: 6 }), null);
});

test("shows a safe actionable message when an offer is blocked by setup", () => {
  const error = fromSupabaseError({ message: "seller_business_setup_required" });
  assert.equal(error.type, "validation");
  assert.equal(error.code, "seller_business_setup_required");
  assert.match(error.message, /Solicitudes/);
});
