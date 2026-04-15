import { Row } from "../db/types";
import { BuyerHomeFilters } from "./buyer.home.filters.service";
import { getSession } from "../lib/supabase";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { supabase } from "../lib/supabase/client";
import { getProfileByUserId } from "./profile.service";

export type PurchaseRequest = Row<"purchase_request">;
export type PurchaseRequestStatusUiOption = {
  statusCode: string;
  label: string;
};
export type SellerHomePurchaseRequestItem = {
  id: string;
  title: string | null;
  summary_text: string | null;
  category_id: string | null;
  category_name: string | null;
  category_path: string | null;
  status: string;
  status_label: string | null;
  published_at: string | null;
  created_at: string;
  views_count: number;
};

export type SellerHomePurchaseRequestGroup = {
  code: string;
  name: string;
  total: number;
  items: SellerHomePurchaseRequestItem[];
};
export type BuyerHomePurchaseRequestItem = SellerHomePurchaseRequestItem;
export type BuyerHomePurchaseRequestGroup = SellerHomePurchaseRequestGroup;
const PURCHASE_REQUEST_SELECT = [
  "id",
  "profile_id",
  "draft_id",
  "category_id",
  "category_path",
  "category_name",
  "title",
  "summary_text",
  "contract",
  "status",
  "created_at",
  "published_at",
  "updated_at",
].join(",");

export async function getPurchaseRequestById(
  purchaseRequestId: string
): Promise<{ ok: true; data: PurchaseRequest } | { ok: false; error: AppError } | null> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };

  const { data, error } = await supabase
    .from("purchase_request")
    .select(PURCHASE_REQUEST_SELECT)
    .eq("id", purchaseRequestId)
    .maybeSingle();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data) return null;
  return { ok: true, data: data as unknown as PurchaseRequest };
}

export async function getPurchaseRequestByProfileId(
  profileId: string
): Promise<{ ok: true; data: PurchaseRequest } | { ok: false; error: AppError } | null> {
  const visualization = await supabase
    .from("purchase_request_visualization")
    .select("purchase_request_id")
    .eq("profile_id", profileId)
    .not("purchase_request_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(25);

  if (visualization.error) {
    return { ok: false, error: fromSupabaseError(visualization.error) };
  }

  const purchaseRequestIds = (visualization.data ?? [])
    .map((row) => row.purchase_request_id)
    .filter((value): value is string => Boolean(value));
  if (purchaseRequestIds.length === 0) return null;

  for (const purchaseRequestId of purchaseRequestIds) {
    const request = await getPurchaseRequestById(purchaseRequestId);
    if (request?.ok === false) return request;
    if (request) return request;
  }

  return null;
}

export async function getCurrentUserPurchaseRequest(): Promise<
  { ok: true; data: PurchaseRequest | null } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: true, data: null };

  const request = await getPurchaseRequestByProfileId(profile.data.id);
  if (request?.ok === false) return { ok: false, error: request.error };
  if (!request) return { ok: true, data: null };

  return { ok: true, data: request.data };
}

function parseSellerHomePurchaseRequestItem(
  raw: unknown
): SellerHomePurchaseRequestItem | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id : "";
  const status = typeof value.status === "string" ? value.status : "";
  const createdAt = typeof value.created_at === "string" ? value.created_at : "";
  if (!id || !status || !createdAt) return null;

  return {
    id,
    title: typeof value.title === "string" ? value.title : null,
    summary_text: typeof value.summary_text === "string" ? value.summary_text : null,
    category_id: typeof value.category_id === "string" ? value.category_id : null,
    category_name: typeof value.category_name === "string" ? value.category_name : null,
    category_path: typeof value.category_path === "string" ? value.category_path : null,
    status,
    status_label: typeof value.status_label === "string" ? value.status_label : null,
    published_at: typeof value.published_at === "string" ? value.published_at : null,
    created_at: createdAt,
    views_count: typeof value.views_count === "number" ? value.views_count : 0,
  };
}

function parseSellerHomePurchaseRequestGroup(
  raw: unknown
): SellerHomePurchaseRequestGroup | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const code = typeof value.code === "string" ? value.code : "";
  const name = typeof value.name === "string" ? value.name : "";
  if (!code || !name) return null;

  const itemsRaw = Array.isArray(value.items) ? value.items : [];
  const items = itemsRaw
    .map(parseSellerHomePurchaseRequestItem)
    .filter((item): item is SellerHomePurchaseRequestItem => item !== null);

  return {
    code,
    name,
    total: typeof value.total === "number" ? value.total : items.length,
    items,
  };
}

function extractBuyerHomePurchaseRequestGroups(
  payload: unknown
): BuyerHomePurchaseRequestGroup[] {
  const groupsRaw: unknown[] =
    payload && typeof payload === "object" && Array.isArray((payload as any).groups)
      ? (payload as any).groups
      : [];

  return groupsRaw
    .map(parseSellerHomePurchaseRequestGroup)
    .filter((group): group is BuyerHomePurchaseRequestGroup => group !== null);
}

function getBuyerHomeItemDate(item: BuyerHomePurchaseRequestItem): string {
  const rawDate = item.published_at ?? item.created_at;
  if (typeof rawDate === "string" && rawDate.length >= 10) {
    return rawDate.slice(0, 10);
  }

  return "";
}

function applyBuyerHomeFiltersToGroups(
  groups: BuyerHomePurchaseRequestGroup[],
  filters?: BuyerHomeFilters
): BuyerHomePurchaseRequestGroup[] {
  if (!filters) return groups;

  const searchValue = filters.searchValue.trim().toLocaleLowerCase();
  const startDate = filters.startDate.trim();
  const endDate = filters.endDate.trim();
  const selectedStatuses = new Set(filters.selectedChipIds.map((value) => value.trim()));
  const hasFilters = Boolean(
    searchValue || startDate || endDate || selectedStatuses.size > 0
  );

  if (!hasFilters) return groups;

  return groups.map((group) => {
    const items = group.items.filter((item) => {
      const title = item.title?.toLocaleLowerCase() ?? "";
      const itemDate = getBuyerHomeItemDate(item);

      if (searchValue && !title.includes(searchValue)) return false;
      if (startDate && (!itemDate || itemDate < startDate)) return false;
      if (endDate && (!itemDate || itemDate > endDate)) return false;
      if (selectedStatuses.size > 0 && !selectedStatuses.has(item.status)) return false;

      return true;
    });

    return {
      ...group,
      total: items.length,
      items,
    };
  });
}

function isBuyerHomeLegacyRpcError(error: any) {
  if (!error || error.code !== "PGRST202") return false;
  const message = typeof error.message === "string" ? error.message : "";
  return message.includes("get_buyer_home_purchase_requests");
}

function mapPurchaseRequestStatusUiOption(
  raw: unknown
): PurchaseRequestStatusUiOption | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const statusCode = typeof value.status_code === "string" ? value.status_code : "";
  const label = typeof value.ui_text === "string" ? value.ui_text : "";
  if (!statusCode || !label) return null;

  return {
    statusCode,
    label,
  };
}

export async function getCurrentSellerHomePurchaseRequestGroups(): Promise<
  { ok: true; data: SellerHomePurchaseRequestGroup[] } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: true, data: [] };

  const rpcResult: any = await (supabase as any).rpc("get_seller_home_purchase_requests", {
    p_profile_id: profile.data.id,
  });

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  const payload = rpcResult?.data;
  const groupsRaw: unknown[] =
    payload && typeof payload === "object" && Array.isArray((payload as any).groups)
      ? (payload as any).groups
      : [];

  const groups = groupsRaw
    .map(parseSellerHomePurchaseRequestGroup)
    .filter((group): group is SellerHomePurchaseRequestGroup => group !== null);

  return { ok: true, data: groups };
}

export async function getCurrentBuyerHomePurchaseRequestGroups(
  filters?: BuyerHomeFilters
): Promise<
  { ok: true; data: BuyerHomePurchaseRequestGroup[] } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: true, data: [] };

  const rpcArgs = {
    p_profile_id: profile.data.id,
    p_search_text: filters?.searchValue?.trim() || null,
    p_start_date: filters?.startDate?.trim() || null,
    p_end_date: filters?.endDate?.trim() || null,
    p_status_codes:
      filters?.selectedChipIds && filters.selectedChipIds.length > 0
        ? filters.selectedChipIds
        : null,
  };

  const rpcResult: any = await (supabase as any).rpc("get_buyer_home_purchase_requests", rpcArgs);

  if (rpcResult?.error && isBuyerHomeLegacyRpcError(rpcResult.error)) {
    const legacyRpcResult: any = await (supabase as any).rpc("get_buyer_home_purchase_requests", {
      p_profile_id: profile.data.id,
    });

    if (legacyRpcResult?.error) {
      return { ok: false, error: fromSupabaseError(legacyRpcResult.error) };
    }

    return {
      ok: true,
      data: applyBuyerHomeFiltersToGroups(
        extractBuyerHomePurchaseRequestGroups(legacyRpcResult?.data),
        filters
      ),
    };
  }

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  return { ok: true, data: extractBuyerHomePurchaseRequestGroups(rpcResult?.data) };
}

export async function getPurchaseRequestStatusUiOptions(): Promise<
  { ok: true; data: PurchaseRequestStatusUiOption[] } | { ok: false; error: AppError }
> {
  const { data, error } = await (supabase as any)
    .from("purchase_request_status_ui")
    .select("status_code, ui_text");

  if (error) return { ok: false, error: fromSupabaseError(error) };

  const rows = Array.isArray(data) ? data : [];
  const mapped = rows
    .map(mapPurchaseRequestStatusUiOption)
    .filter((item): item is PurchaseRequestStatusUiOption => item !== null);

  return { ok: true, data: mapped };
}
