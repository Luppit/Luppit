import assert from "node:assert/strict";
import test from "node:test";

import { parseBuyerHomeOnboarding } from "../src/services/buyer.home.onboarding.helpers.ts";

test("home only identifies first use from authoritative complete onboarding metadata", () => {
  for (const raw of [null, undefined, {}, { has_published_requests: false },
    { has_published_requests: "false", latest_draft: null },
    { has_published_requests: false, latest_draft: { title: "Missing identity" } }]) {
    assert.equal(parseBuyerHomeOnboarding(raw), null);
  }
  assert.deepEqual(parseBuyerHomeOnboarding({ has_published_requests: false, latest_draft: null }), {
    hasPublishedRequests: false,
    latestDraft: null,
  });
});

test("saved draft metadata preserves the server identity and summary without inventing missing text", () => {
  assert.deepEqual(parseBuyerHomeOnboarding({
    has_published_requests: true,
    latest_draft: {
      id: "draft-1", title: " Solicitud guardada ",
      summary_text: " Dos unidades para uso diario ", updated_at: "2026-11-06T12:00:00Z",
    },
  }), {
    hasPublishedRequests: true,
    latestDraft: {
      id: "draft-1", title: "Solicitud guardada", summaryText: "Dos unidades para uso diario",
      updatedAt: "2026-11-06T12:00:00Z",
    },
  });
  assert.deepEqual(parseBuyerHomeOnboarding({
    has_published_requests: false, latest_draft: { id: "draft-2" },
  })?.latestDraft, { id: "draft-2", title: null, summaryText: null, updatedAt: null });
});
