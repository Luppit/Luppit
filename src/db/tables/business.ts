import { Row, TableName } from "../types";

export const TB_BUSINESS = "business" as const satisfies TableName;

export const COL_BUSINESS = {
  id: "id",
  created_at: "created_at",
  name: "name",
  id_document: "id_document",
  legal_name: "legal_name",
  location_id: "location_id",
  privacy_purge_after: "privacy_purge_after",
  image_path: "image_path",
  marketplace_availability_status: "marketplace_availability_status",
  availability_notification_requested_at: "availability_notification_requested_at",
  availability_notified_at: "availability_notified_at",
} as const satisfies { [K in keyof Row<"business"> & string]: K };
