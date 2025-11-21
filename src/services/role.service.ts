import { Row } from "../db/types";
import { supabase } from "../lib/supabase";

export type Role = Row<"role">;

export enum Roles {
  BUYER = "buyer",
  SELLER = "seller",
}

export async function getRoleByName(name: Roles): Promise<Role | null> {
  const { data, error } = await supabase
    .from("role")
    .select()
    .eq("name", name)
    .single();
  if (error) {
    throw error;
  }
  return data;
}
