import assert from "node:assert/strict";
import test from "node:test";
import { shouldGroupConversationImages } from "../src/utils/conversationMessageGroup.ts";

const base = {
  sender_profile_id: "11111111-1111-4111-8111-111111111111",
  created_at: "2026-08-22T12:00:00.000Z",
};

test("groups persisted images only when their server group IDs match", () => {
  assert.equal(shouldGroupConversationImages(
    { ...base, message_group_id: "group-a" },
    { ...base, message_group_id: "group-a", created_at: "2026-08-22T13:00:00.000Z" }
  ), true);
  assert.equal(shouldGroupConversationImages(
    { ...base, message_group_id: "group-a" },
    { ...base, message_group_id: "group-b" }
  ), false);
});

test("keeps the short time-window fallback for legacy ungrouped images", () => {
  assert.equal(shouldGroupConversationImages(
    base,
    { ...base, created_at: "2026-08-22T12:01:00.000Z" }
  ), true);
  assert.equal(shouldGroupConversationImages(
    base,
    { ...base, created_at: "2026-08-22T12:03:00.000Z" }
  ), false);
});
