import assert from "node:assert/strict";
import test from "node:test";
import { parseBuyerProfileSetup, parsePendingSellerBusinessSetup, parseSellerBusinessSetup, parseSellerLocationAvailability } from "../src/services/seller.business.setup.helpers.ts";
import { fromSupabaseError } from "../src/lib/supabase/errors.ts";

function setup(completed = 2) {
  return {
    business_id: "business", location_id: null,
    completed_count: completed, total_count: 5, is_complete: completed === 5,
    steps: ["email", "categories", "location", "photo", "notifications"]
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
  assert.equal(parsed?.totalCount, 5);
  assert.equal(parsed?.steps.find((step) => step.code === "location")?.canEdit, false);
});

test("requires the notification step even when every saved business field is complete", () => {
  assert.equal(parseSellerBusinessSetup(setup(4))?.isComplete, false);
  assert.equal(parseSellerBusinessSetup(setup(5))?.isComplete, true);
});

test("pending seller settings stay separate from marketplace readiness", () => {
  const raw = {
    application_id: "verification-application",
    category_ids: ["category"],
    location_id: "district",
    location_label: "Distrito, Cantón, Provincia",
    image_path: "storage://profile-images/businesses/verification-application/photo.jpg",
    completed_count: 3,
    total_count: 3,
    is_complete: true,
    steps: setup(5).steps.filter((step) => ["categories", "location", "photo"].includes(step.code)),
  };
  const parsed = parsePendingSellerBusinessSetup(raw);
  assert.equal(parsed?.applicationId, raw.application_id);
  assert.deepEqual(parsed?.categoryIds, raw.category_ids);
  assert.equal(parsed?.locationId, raw.location_id);
  assert.equal(parsed?.imagePath, raw.image_path);
  assert.equal(parsed?.isComplete, true);
  assert.equal(parseSellerBusinessSetup({ ...raw, business_id: "business" }), null);
  assert.equal(parsePendingSellerBusinessSetup({ ...raw, category_ids: [null] }), null);
});

test("completes the five-step checklist without a business-name setup field", () => {
  const parsed = parseSellerBusinessSetup(setup(5));
  assert.equal(parsed?.isComplete, true);
  assert.deepEqual(parsed?.steps.map((step) => step.code), [
    "email", "categories", "location", "photo", "notifications",
  ]);
});

test("rejects incomplete, duplicate, unknown and inconsistent readiness responses", () => {
  assert.equal(parseSellerBusinessSetup(null), null);
  const missing = setup();
  missing.steps.pop();
  assert.equal(parseSellerBusinessSetup(missing), null);
  const duplicate = setup();
  duplicate.steps[4].code = "email";
  assert.equal(parseSellerBusinessSetup(duplicate), null);
  const unknown = setup();
  unknown.steps[4].code = "unknown";
  assert.equal(parseSellerBusinessSetup(unknown), null);
  assert.equal(parseSellerBusinessSetup({ ...setup(), is_complete: true }), null);
  assert.equal(parseSellerBusinessSetup({ ...setup(), completed_count: 5 }), null);
});

test("shows a safe actionable message when an offer is blocked by setup", () => {
  const error = fromSupabaseError({ message: "seller_business_setup_required" });
  assert.equal(error.type, "validation");
  assert.equal(error.code, "seller_business_setup_required");
  assert.match(error.message, /Solicitudes/);
});

test("buyer setup keeps server order and requires location without seller categories", () => {
  const raw = {
    profile_id: "buyer", location_id: "district", location_label: "Distrito, Cantón, Provincia",
    completed_count: 3, total_count: 4, is_complete: false,
    steps: ["notifications", "photo", "email", "location"].map((code) => ({
      code, label: code, icon: "map-pin", action_label: code, can_edit: true,
      is_complete: code !== "location", description: null,
    })),
  };
  const parsed = parseBuyerProfileSetup(raw);
  assert.equal(parsed?.profileId, "buyer");
  assert.equal(parsed?.locationId, "district");
  assert.equal(parsed?.isComplete, false);
  assert.equal(parsed?.canSaveDraft, false);
  const draftAllowed = parseBuyerProfileSetup({
    ...raw,
    can_save_draft: true,
    onboarding: { has_published_requests: false, latest_draft: { id: "draft", title: "Silla" } },
  });
  assert.equal(draftAllowed?.canSaveDraft, true);
  assert.equal(draftAllowed?.isComplete, false);
  assert.equal(draftAllowed?.onboarding?.latestDraft?.title, "Silla");
  assert.deepEqual(parsed?.steps.map((step) => step.code), ["notifications", "photo", "email", "location"]);
  assert.equal(parseBuyerProfileSetup({ ...raw, is_complete: true }), null);
  assert.equal(parseBuyerProfileSetup({ ...raw, profile_id: null }), null);
  assert.equal(parseBuyerProfileSetup({ ...raw, steps: [...raw.steps.slice(0, 3), { ...raw.steps[3], code: "categories" }] }), null);
  assert.equal(parseBuyerProfileSetup(setup()), null);
});

test("availability comes from the server and preserves correction permissions and waitlist enrollment", () => {
  const raw = { availability_status: "unavailable", availability_message: "Próximamente en tu zona",
    notification_requested: true, location_id: "district", location_label: "Distrito",
    can_edit: false };
  const parsed = parseSellerLocationAvailability(raw);
  assert.equal(parsed?.status, "unavailable");
  assert.equal(parsed?.notificationRequested, true);
  assert.equal(parsed?.canEdit, false);
  assert.equal(parsed?.message, raw.availability_message);
  assert.equal(parseSellerLocationAvailability({ ...raw, availability_status: "unknown" }), null);
  assert.equal(parseSellerLocationAvailability({ ...raw, notification_requested: undefined }), null);
});
