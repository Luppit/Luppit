import { COL_CATEGORY, TB_CATEGORY } from "../db/tables";
import { Row } from "../db/types";
import { supabase } from "../lib/supabase";

type Category = Row<"category">;

export async function listCategories(): Promise<Category[]> {

    let query = supabase
        .from(TB_CATEGORY)
        .select('*')
        .eq(COL_CATEGORY.id, '44')
        .order(COL_CATEGORY.id, { ascending: true });

    const { data, error } = await query;
    const categories: Category[] = data ?? [];
    if (error) throw error;
    return categories; 
}