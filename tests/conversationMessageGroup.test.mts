import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConversationMessageRenderGroups,
  getConversationMessageLogicalKey,
  shouldGroupConversationImages,
} from "../src/utils/conversationMessageGroup.ts";

const base = {
  id: "message-base",
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

test("renders text plus three shuffled images as one index-ordered group", () => {
  const groupId = "group-a";
  const created_at = "2026-08-22T12:00:00.000Z";
  const messages = [
    { ...base, id: "image-2", created_at, message_group_id: groupId,
      message_group_index: 2, message_kind: "IMAGE", image_url: "two" },
    { ...base, id: "text", created_at, message_group_id: groupId,
      message_group_index: 0, message_kind: "TEXT", text: "Hola" },
    { ...base, id: "image-1", created_at, message_group_id: groupId,
      message_group_index: 1, message_kind: "IMAGE", image_url: "one" },
    { ...base, id: "image-3", created_at, message_group_id: groupId,
      message_group_index: 3, message_kind: "IMAGE", image_url: "three" },
  ];

  const groups = buildConversationMessageRenderGroups(messages);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].type, "messageGroup");
  assert.deepEqual(
    groups[0].messages.map(
      (message) => `${message.message_kind}:${message.message_group_index}`
    ),
    ["TEXT:0", "IMAGE:1", "IMAGE:2", "IMAGE:3"]
  );
});

test("uses group index as the realtime optimistic replacement key", () => {
  assert.equal(
    getConversationMessageLogicalKey({
      ...base,
      message_group_id: "group-a",
      message_group_index: 2,
    }),
    "group:group-a:2"
  );
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
