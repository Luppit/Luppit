import { AppError, fromSupabaseError } from "../lib/supabase/errors";
import { supabase } from "../lib/supabase/client";

export type Segment = {
  name: string;
  svgName: string;
  isDisabled: boolean;
};

type SelectedSegmentListener = (segmentSvgName: string) => void;

export const ALL_SEGMENTS_SVG_NAME = "todas";

const selectedSegmentListeners = new Set<SelectedSegmentListener>();
let currentSelectedSegmentSvgName = ALL_SEGMENTS_SVG_NAME;

function mapSegment(value: any): Segment | null {
  if (!value || typeof value !== "object") return null;

  const name = typeof value.name === "string" ? value.name : "";
  const svgName = typeof value.svg_name === "string" ? value.svg_name : "";
  const isDisabled = typeof value.is_disabled === "boolean" ? value.is_disabled : false;

  if (!name || !svgName) return null;

  return {
    name,
    svgName,
    isDisabled,
  };
}

export async function getSegments(): Promise<
  { ok: true; data: Segment[] } | { ok: false; error: AppError }
> {
  const { data, error } = await (supabase as any)
    .from("segment")
    .select("name, svg_name, is_disabled, created_at")
    .order("created_at", { ascending: true });

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
