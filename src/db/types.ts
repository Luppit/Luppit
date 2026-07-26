import { Database } from "@/src/types/database.types";

export type Schema = Database["public"];
export type Tables = Schema["Tables"];
export type TableName = keyof Tables & string;
export type Row<K extends TableName> = Tables[K]["Row"];
export type InsertRow<K extends TableName> = Tables[K]["Insert"];
export type UpdateRow<K extends TableName> = Tables[K]["Update"];
export type Views = Schema["Views"];
export type ViewName = keyof Views & string;
export type ViewRow<K extends ViewName> = Views[K]["Row"];
export type Functions = Schema["Functions"];
export type FunctionName = keyof Functions & string;
export type FunctionArgs<K extends FunctionName> = Functions[K]["Args"];
export type FunctionReturns<K extends FunctionName> = Functions[K]["Returns"];
