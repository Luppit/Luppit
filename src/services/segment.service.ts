import { COL_SEGMENT, TB_SEGMENT } from "../db/tables";
import { Row } from "../db/types";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";
import { supabase } from "../lib/supabase/client";

export type Segment = {
  name: string;
  svgName: string;
  isDisabled: boolean;
  sortOrder: number;
};

type SelectedSegmentListener = (segmentSvgName: string) => void;
type SegmentRow = Pick<
  Row<"segment">,
  "name" | "svg_name" | "is_disabled" | "sort_order"
>;

export const ALL_SEGMENTS_SVG_NAME = "todas";

const selectedSegmentListeners = new Set<SelectedSegmentListener>();
let currentSelectedSegmentSvgName = ALL_SEGMENTS_SVG_NAME;

function mapSegment(value: unknown): Segment | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Partial<SegmentRow>;
  const name = typeof row.name === "string" ? row.name : "";
  const svgName = typeof row.svg_name === "string" ? row.svg_name : "";
  const isDisabled = typeof row.is_disabled === "boolean" ? row.is_disabled : false;
  const sortOrder = typeof row.sort_order === "number" ? row.sort_order : 100;

  if (!name || !svgName) return null;

  return {
    name,
    svgName,
    isDisabled,
    sortOrder,
  };
}

export async function getSegments(): Promise<
  { ok: true; data: Segment[] } | { ok: false; error: AppError }
> {
  const { data, error } = await supabase
    .from(TB_SEGMENT)
    .select("name, svg_name, is_disabled, sort_order")
    .order(COL_SEGMENT.sort_order, { ascending: true })
    .order(COL_SEGMENT.created_at, { ascending: true });

  if (error) return { ok: false, error: fromSupabaseError(error) };

  const rows = Array.isArray(data) ? data : [];
  const mapped = rows.map(mapSegment).filter((segment): segment is Segment => segment !== null);

  return { ok: true, data: mapped };
}

function normalizeSegmentSvgName(segmentSvgName: string) {
  return segmentSvgName.trim() || ALL_SEGMENTS_SVG_NAME;
}

function emitSelectedSegment() {
  selectedSegmentListeners.forEach((listener) => listener(currentSelectedSegmentSvgName));
}

export function getSelectedSegmentSvgName() {
  return currentSelectedSegmentSvgName;
}

export function setSelectedSegmentSvgName(segmentSvgName: string) {
  const nextSegmentSvgName = normalizeSegmentSvgName(segmentSvgName);
  if (nextSegmentSvgName === currentSelectedSegmentSvgName) return;

  currentSelectedSegmentSvgName = nextSegmentSvgName;
  emitSelectedSegment();
}

export function subscribeSelectedSegment(listener: SelectedSegmentListener) {
  selectedSegmentListeners.add(listener);
  listener(currentSelectedSegmentSvgName);
  return () => {
    selectedSegmentListeners.delete(listener);
  };
}
