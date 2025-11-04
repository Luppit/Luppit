import { Row, TableName } from "../types";

export const TB_CATEGORY = 'category' as const satisfies TableName;

export const COL_CATEGORY = {
    id : 'id',
    path : 'path',
    name : 'name',
} as const satisfies { [K in keyof Row<"category"> & string]: K }; 