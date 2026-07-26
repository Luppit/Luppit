import { Row, TableName } from "../types";

export const TB_REQUEST_DRAFT_MESSAGE =
  "request_draft_message" as const satisfies TableName;

export const COL_REQUEST_DRAFT_MESSAGE = {
  content: "content",
  created_at: "created_at",
  draft_id: "draft_id",
  id: "id",
  metadata: "metadata",
  profile_id: "profile_id",
  role: "role",
  sequence_id: "sequence_id",
} as const satisfies {
  [K in keyof Row<"request_draft_message"> & string]: K;
};
