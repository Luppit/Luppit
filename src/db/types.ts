import { Database } from "@/src/types/database.types";

export type Schema = Database["public"];
export type Tables = Schema["Tables"];
export type TableName = keyof Tables & string;
export type Row<K extends TableName> = Tables[K]["Row"];
export type InsertRow<K extends TableName> = Tables[K]["Insert"];
export type UpdateRow<K extends TableName> = Tables[K]["Update"];