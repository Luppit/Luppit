import { Row } from "../db/types";
import { BuyerHomeFilters } from "./buyer.home.filters.service";
import {
  SellerHomeFilters,
  SellerHomeInteractionState,
} from "./seller.home.filters.service";
import { getSession } from "../lib/supabase";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { supabase } from "../lib/supabase/client";
import { getProfileByUserId } from "./profile.service";
import { ALL_SEGMENTS_SVG_NAME } from "./segment.service";

export type PurchaseRequest = Row<"purchase_request">;
export type PurchaseRequestStatusUiOption = {
  statusCode: string;
  label: string;
  styleCode: string | null;
};
export type AddPurchaseRequestFavoriteResult = {
  favoriteId: string | null;
  alreadyExists: boolean;
  roleName: string | null;
};
export type RemovePurchaseRequestFavoriteResult = {
  favoriteId: string | null;
  removed: boolean;
  roleName: string | null;
};
export type PurchaseRequestFavoriteFilters = {
  searchValue: string;
  startDate: string;
  endDate: string;
  selectedCategoryIds: string[];
  selectedStatusCodes: string[];
};
export type PurchaseRequestFavoriteItem = SellerHomePurchaseRequestItem & {
  favorite_id: string;
  favorited_at: string;
  offers_count: number;
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
  status_style_code: string | null;
  published_at: string | null;
  created_at: string;
  views_count: number;
  offers_count?: number | null;
  seller_interaction_state?: SellerHomeInteractionState | null;
};

export type SellerHomePurchaseRequestGroup = {
  code: string;
  name: string;
  total: number;
  items: SellerHomePurchaseRequestItem[];
};
export type BuyerHomePurchaseRequestItem = SellerHomePurchaseRequestItem;
export type BuyerHomePurchaseRequestGroup = SellerHomePurchaseRequestGroup;
export type SellerHomeFilterCategoryOption = {
  id: string;
  label: string;
};
export type MarketplaceHubRole = "buyer" | "seller";
export type MarketplaceHubOverview = {
  active_request_count: number;
  attention_request_count: number;
  unread_conversation_count: number;
  unread_message_count: number;
};
export type MarketplaceHubPriority = {
  code: string | null;
  label: string | null;
  style_code: string | null;
  rank: number;
};
export type MarketplaceHubReason = {
  code: string | null;
  label: string | null;
  detail: string | null;
};
export type MarketplaceHubAction = {
  code: string | null;
  label: string | null;
  icon: string | null;
  style_code: string | null;
  ui_slot: string | null;
  execution_type: string | null;
  target: string | null;
};
export type MarketplaceHubNavigation = {
  target: "purchase_request" | "seller_opportunity" | "conversation" | string;
  conversation_id: string | null;
  purchase_request_id: string | null;
};
export type MarketplaceHubItem = SellerHomePurchaseRequestItem & {
  hub_item_id: string;
  entity_type: string | null;
  purchase_request_id: string;
  conversation_id: string | null;
  purchase_offer_id: string | null;
  event_at: string | null;
  unread_count: number;
  has_unopened: boolean;
  due_at: string | null;
  is_overdue: boolean;
  priority: MarketplaceHubPriority | null;
  reason: MarketplaceHubReason | null;
  action: MarketplaceHubAction | null;
  navigation: MarketplaceHubNavigation | null;
  ranking_score: number;
};
export type MarketplaceHubStage = {
  code: string;
  name: string;
  description: string | null;
  count: number;
  is_selected: boolean;
};
export type MarketplaceHubRail = {
  title: string;
  description: string | null;
  total: number;
  items: MarketplaceHubItem[];
};
export type MarketplaceHub = {
  version: number;
  role_code: MarketplaceHubRole;
  generated_at: string | null;
  overview: MarketplaceHubOverview;
  stages: MarketplaceHubStage[];
  rail: MarketplaceHubRail;
};
export type MarketplaceHubItemsPage = {
  items: MarketplaceHubItem[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
};
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

function parseSellerHomeInteractionState(raw: unknown): SellerHomeInteractionState | null {
  if (raw !== "new" && raw !== "opened" && raw !== "discarded") return null;
  return raw;
}

function parseCount(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  if (typeof raw !== "string") return 0;

  const count = Number(raw);
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.floor(count));
}

function normalizeNullableString(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
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
    status_style_code:
      typeof value.status_style_code === "string"
        ? value.status_style_code
        : typeof value.style_code === "string"
          ? value.style_code
          : null,
    published_at: typeof value.published_at === "string" ? value.published_at : null,
    created_at: createdAt,
    views_count: parseCount(
      value.views_count ??
        value.view_count ??
        value.visualization_count ??
        value.visualizations_count
    ),
    offers_count: typeof value.offers_count === "number" ? value.offers_count : null,
    seller_interaction_state: parseSellerHomeInteractionState(value.seller_interaction_state),
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

function parsePurchaseRequestFavoriteItem(raw: unknown): PurchaseRequestFavoriteItem | null {
  const item = parseSellerHomePurchaseRequestItem(raw);
  if (!item || !raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const favoriteId = typeof value.favorite_id === "string" ? value.favorite_id : "";
  const favoritedAt = typeof value.favorited_at === "string" ? value.favorited_at : "";
  if (!favoriteId || !favoritedAt) return null;

  return {
    ...item,
    favorite_id: favoriteId,
    favorited_at: favoritedAt,
    offers_count: typeof value.offers_count === "number" ? value.offers_count : 0,
  };
}

function parseMarketplaceHubPriority(raw: unknown): MarketplaceHubPriority | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  return {
    code: normalizeNullableString(value.code),
    label: normalizeNullableString(value.label),
    style_code: normalizeNullableString(value.style_code),
    rank: parseCount(value.rank),
  };
}

function parseMarketplaceHubReason(raw: unknown): MarketplaceHubReason | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  return {
    code: normalizeNullableString(value.code),
    label: normalizeNullableString(value.label),
    detail: normalizeNullableString(value.detail),
  };
}

function parseMarketplaceHubAction(raw: unknown): MarketplaceHubAction | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  return {
    code: normalizeNullableString(value.code),
    label: normalizeNullableString(value.label),
    icon: normalizeNullableString(value.icon),
    style_code: normalizeNullableString(value.style_code),
    ui_slot: normalizeNullableString(value.ui_slot),
    execution_type: normalizeNullableString(value.execution_type),
    target: normalizeNullableString(value.target),
  };
}

function parseMarketplaceHubNavigation(raw: unknown): MarketplaceHubNavigation | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const target = normalizeNullableString(value.target);
  if (!target) return null;

  return {
    target,
    conversation_id: normalizeNullableString(value.conversation_id),
    purchase_request_id: normalizeNullableString(value.purchase_request_id),
  };
}

function parseMarketplaceHubItem(raw: unknown): MarketplaceHubItem | null {
  const item = parseSellerHomePurchaseRequestItem(raw);
  if (!item || !raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const hubItemId = normalizeNullableString(value.hub_item_id) ?? item.id;
  const purchaseRequestId =
    normalizeNullableString(value.purchase_request_id) ?? item.id;

  return {
    ...item,
    hub_item_id: hubItemId,
    entity_type: normalizeNullableString(value.entity_type),
    purchase_request_id: purchaseRequestId,
    conversation_id: normalizeNullableString(value.conversation_id),
    purchase_offer_id: normalizeNullableString(value.purchase_offer_id),
    event_at: normalizeNullableString(value.event_at),
    unread_count: parseCount(value.unread_count),
    has_unopened: value.has_unopened === true || parseCount(value.unread_count) > 0,
    due_at: normalizeNullableString(value.due_at),
    is_overdue: value.is_overdue === true,
    priority: parseMarketplaceHubPriority(value.priority),
    reason: parseMarketplaceHubReason(value.reason),
    action: parseMarketplaceHubAction(value.action),
    navigation: parseMarketplaceHubNavigation(value.navigation),
    ranking_score: parseCount(value.ranking_score),
  };
}

function parseMarketplaceHubStage(raw: unknown): MarketplaceHubStage | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const code = normalizeNullableString(value.code) ?? "";
  const name = normalizeNullableString(value.name) ?? "";
  if (!code || !name) return null;

  return {
    code,
    name,
    description: normalizeNullableString(value.description),
    count: parseCount(value.count),
    is_selected: value.is_selected === true,
  };
}

function parseMarketplaceHubOverview(raw: unknown): MarketplaceHubOverview {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    active_request_count: parseCount(value.active_request_count),
    attention_request_count: parseCount(value.attention_request_count),
    unread_conversation_count: parseCount(value.unread_conversation_count),
    unread_message_count: parseCount(value.unread_message_count),
  };
}

function parseMarketplaceHubRail(raw: unknown): MarketplaceHubRail {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items = rawItems
    .map(parseMarketplaceHubItem)
    .filter((item): item is MarketplaceHubItem => item !== null);

  return {
    title: normalizeNullableString(value.title) ?? "",
    description: normalizeNullableString(value.description),
    total: parseCount(value.total),
    items,
  };
}

function extractMarketplaceHub(
  payload: unknown,
  fallbackRole: MarketplaceHubRole
): MarketplaceHub {
  const value = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rawStages = Array.isArray(value.stages) ? value.stages : [];
  const roleCode = value.role_code === "seller" || value.role_code === "buyer"
    ? value.role_code
    : fallbackRole;

  return {
    version: parseCount(value.version) || 2,
    role_code: roleCode,
    generated_at: normalizeNullableString(value.generated_at),
    overview: parseMarketplaceHubOverview(value.overview),
    stages: rawStages
      .map(parseMarketplaceHubStage)
      .filter((stage): stage is MarketplaceHubStage => stage !== null),
    rail: parseMarketplaceHubRail(value.rail),
  };
}

function parsePositiveInteger(raw: unknown, fallback: number): number {
  const value = parseCount(raw);
  return value > 0 ? value : fallback;
}

function extractMarketplaceHubItemsPage(
  payload: unknown,
  fallbackPage: number,
  fallbackPageSize: number
): MarketplaceHubItemsPage {
  const value = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items = rawItems
    .map(parseMarketplaceHubItem)
    .filter((item): item is MarketplaceHubItem => item !== null);
  const total = parseCount(value.total);
  const page = parsePositiveInteger(value.page, fallbackPage);
  const pageSize = parsePositiveInteger(value.page_size, fallbackPageSize);

  return {
    items,
    total,
    page,
    page_size: pageSize,
    has_more:
      typeof value.has_more === "boolean"
        ? value.has_more
        : page * pageSize < total,
  };
}

function extractPurchaseRequestFavoriteItems(payload: unknown): PurchaseRequestFavoriteItem[] {
  const itemsRaw: unknown[] =
    payload && typeof payload === "object" && Array.isArray((payload as any).items)
      ? (payload as any).items
      : [];

  return itemsRaw
    .map(parsePurchaseRequestFavoriteItem)
    .filter((item): item is PurchaseRequestFavoriteItem => item !== null);
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

function extractSellerHomePurchaseRequestGroups(
  payload: unknown
): SellerHomePurchaseRequestGroup[] {
  const groupsRaw: unknown[] =
    payload && typeof payload === "object" && Array.isArray((payload as any).groups)
      ? (payload as any).groups
      : [];

  return groupsRaw
    .map(parseSellerHomePurchaseRequestGroup)
    .filter((group): group is SellerHomePurchaseRequestGroup => group !== null);
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

function inferLegacySellerInteractionState(
  groupCode: string,
  item: SellerHomePurchaseRequestItem
): SellerHomeInteractionState | null {
  if (item.seller_interaction_state) return item.seller_interaction_state;
  if (groupCode === "discarded") return "discarded";
  return null;
}

function applySellerHomeFiltersToGroups(
  groups: SellerHomePurchaseRequestGroup[],
  filters?: SellerHomeFilters
): SellerHomePurchaseRequestGroup[] {
  if (!filters) return groups;

  const searchValue = filters.searchValue.trim().toLocaleLowerCase();
  const startDate = filters.startDate.trim();
  const endDate = filters.endDate.trim();
  const selectedCategoryIds = new Set(filters.selectedCategoryIds.map((value) => value.trim()));
  const selectedInteractionStates = new Set(
    filters.selectedInteractionStates.map((value) => value.trim())
  );
  const hasFilters = Boolean(
    searchValue ||
      startDate ||
      endDate ||
      selectedCategoryIds.size > 0 ||
      selectedInteractionStates.size > 0
  );

  if (!hasFilters) return groups;

  return groups.map((group) => {
    const items = group.items.filter((item) => {
      const title = item.title?.toLocaleLowerCase() ?? "";
      const itemDate = getBuyerHomeItemDate(item);
      const interactionState = inferLegacySellerInteractionState(group.code, item);

      if (searchValue && !title.includes(searchValue)) return false;
      if (startDate && (!itemDate || itemDate < startDate)) return false;
      if (endDate && (!itemDate || itemDate > endDate)) return false;
      if (
        selectedCategoryIds.size > 0 &&
        (!item.category_id || !selectedCategoryIds.has(item.category_id))
      ) {
        return false;
      }
      if (
        selectedInteractionStates.size > 0 &&
        interactionState &&
        !selectedInteractionStates.has(interactionState)
      ) {
        return false;
      }
      if (
        selectedInteractionStates.size > 0 &&
        !interactionState &&
        !selectedInteractionStates.has("new") &&
        !selectedInteractionStates.has("opened")
      ) {
        return false;
      }

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

function isSellerHomeLegacyRpcError(error: any) {
  if (!error || error.code !== "PGRST202") return false;
  const message = typeof error.message === "string" ? error.message : "";
  return message.includes("get_seller_home_purchase_requests");
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
    styleCode: typeof value.style_code === "string" ? value.style_code : null,
  };
}

function mapAddPurchaseRequestFavoriteResult(
  raw: unknown
): AddPurchaseRequestFavoriteResult {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    favoriteId: typeof value.favorite_id === "string" ? value.favorite_id : null,
    alreadyExists: value.already_exists === true,
    roleName: typeof value.role_name === "string" ? value.role_name : null,
  };
}

function mapRemovePurchaseRequestFavoriteResult(
  raw: unknown
): RemovePurchaseRequestFavoriteResult {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    favoriteId: typeof value.favorite_id === "string" ? value.favorite_id : null,
    removed: value.removed === true,
    roleName: typeof value.role_name === "string" ? value.role_name : null,
  };
}

function buildFallbackSellerCategoryOptions(
  groups: SellerHomePurchaseRequestGroup[]
): SellerHomeFilterCategoryOption[] {
  const map = new Map<string, SellerHomeFilterCategoryOption>();

  groups.forEach((group) => {
    group.items.forEach((item) => {
      const id = item.category_id?.trim();
      const label = item.category_name?.trim();
      if (!id || !label || map.has(id)) return;
      map.set(id, { id, label });
    });
  });

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
}

function getHomeSegmentRpcValue(segmentSvgName?: string) {
  const normalized = segmentSvgName?.trim();
  if (!normalized || normalized === ALL_SEGMENTS_SVG_NAME) return null;
  return normalized;
}

export async function getCurrentSellerHomePurchaseRequestGroups(
  filters?: SellerHomeFilters,
  segmentSvgName?: string
): Promise<
  { ok: true; data: SellerHomePurchaseRequestGroup[] } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: true, data: [] };

  const segmentRpcValue = getHomeSegmentRpcValue(segmentSvgName);
  const rpcArgs = {
    p_profile_id: profile.data.id,
    p_search_text: filters?.searchValue?.trim() || null,
    p_start_date: filters?.startDate?.trim() || null,
    p_end_date: filters?.endDate?.trim() || null,
    p_category_ids:
      filters?.selectedCategoryIds && filters.selectedCategoryIds.length > 0
        ? filters.selectedCategoryIds
        : null,
    p_seller_interaction_states:
      filters?.selectedInteractionStates && filters.selectedInteractionStates.length > 0
        ? filters.selectedInteractionStates
        : null,
    ...(segmentRpcValue ? { p_segment_svg_name: segmentRpcValue } : {}),
  };

  const rpcResult: any = await (supabase as any).rpc(
    "get_seller_home_purchase_requests",
    rpcArgs
  );

  if (rpcResult?.error && isSellerHomeLegacyRpcError(rpcResult.error)) {
    const legacyRpcResult: any = await (supabase as any).rpc("get_seller_home_purchase_requests", {
      p_profile_id: profile.data.id,
    });

    if (legacyRpcResult?.error) {
      return { ok: false, error: fromSupabaseError(legacyRpcResult.error) };
    }

    return {
      ok: true,
      data: applySellerHomeFiltersToGroups(
        extractSellerHomePurchaseRequestGroups(legacyRpcResult?.data),
        filters
      ),
    };
  }

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  return { ok: true, data: extractSellerHomePurchaseRequestGroups(rpcResult?.data) };
}

export async function getCurrentBuyerHomePurchaseRequestGroups(
  filters?: BuyerHomeFilters,
  segmentSvgName?: string
): Promise<
  { ok: true; data: BuyerHomePurchaseRequestGroup[] } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: true, data: [] };

  const segmentRpcValue = getHomeSegmentRpcValue(segmentSvgName);
  const rpcArgs = {
    p_profile_id: profile.data.id,
    p_search_text: filters?.searchValue?.trim() || null,
    p_start_date: filters?.startDate?.trim() || null,
    p_end_date: filters?.endDate?.trim() || null,
    p_status_codes:
      filters?.selectedChipIds && filters.selectedChipIds.length > 0
        ? filters.selectedChipIds
        : null,
    ...(segmentRpcValue ? { p_segment_svg_name: segmentRpcValue } : {}),
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

export async function getCurrentSellerMarketplaceHub(
  filters?: SellerHomeFilters,
  segmentSvgName?: string,
  stageCode?: string
): Promise<{ ok: true; data: MarketplaceHub } | { ok: false; error: AppError }> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) {
    return { ok: true, data: extractMarketplaceHub(null, "seller") };
  }

  const segmentRpcValue = getHomeSegmentRpcValue(segmentSvgName);
  const rpcArgs = {
    p_profile_id: profile.data.id,
    p_search_text: filters?.searchValue?.trim() || null,
    p_start_date: filters?.startDate?.trim() || null,
    p_end_date: filters?.endDate?.trim() || null,
    p_category_ids:
      filters?.selectedCategoryIds && filters.selectedCategoryIds.length > 0
        ? filters.selectedCategoryIds
        : null,
    p_seller_interaction_states:
      filters?.selectedInteractionStates && filters.selectedInteractionStates.length > 0
        ? filters.selectedInteractionStates
        : null,
    p_stage_code: stageCode?.trim() || "for_you",
    ...(segmentRpcValue ? { p_segment_svg_name: segmentRpcValue } : {}),
  };

  const rpcResult: any = await (supabase as any).rpc("get_seller_marketplace_hub", rpcArgs);

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  return { ok: true, data: extractMarketplaceHub(rpcResult?.data, "seller") };
}

export async function getCurrentBuyerMarketplaceHub(
  filters?: BuyerHomeFilters,
  segmentSvgName?: string,
  stageCode?: string
): Promise<{ ok: true; data: MarketplaceHub } | { ok: false; error: AppError }> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) {
    return { ok: true, data: extractMarketplaceHub(null, "buyer") };
  }

  const segmentRpcValue = getHomeSegmentRpcValue(segmentSvgName);
  const rpcArgs = {
    p_profile_id: profile.data.id,
    p_search_text: filters?.searchValue?.trim() || null,
    p_start_date: filters?.startDate?.trim() || null,
    p_end_date: filters?.endDate?.trim() || null,
    p_status_codes:
      filters?.selectedChipIds && filters.selectedChipIds.length > 0
        ? filters.selectedChipIds
        : null,
    p_stage_code: stageCode?.trim() || "all",
    ...(segmentRpcValue ? { p_segment_svg_name: segmentRpcValue } : {}),
  };

  const rpcResult: any = await (supabase as any).rpc("get_buyer_marketplace_hub", rpcArgs);

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  return { ok: true, data: extractMarketplaceHub(rpcResult?.data, "buyer") };
}

export async function getCurrentSellerMarketplaceHubItems(
  filters?: SellerHomeFilters,
  segmentSvgName?: string,
  stageCode?: string,
  page?: number,
  pageSize?: number
): Promise<
  { ok: true; data: MarketplaceHubItemsPage } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };

  const normalizedPage = parsePositiveInteger(page, 1);
  const normalizedPageSize = parsePositiveInteger(pageSize, 20);
  if (!profile) {
    return {
      ok: true,
      data: extractMarketplaceHubItemsPage(null, normalizedPage, normalizedPageSize),
    };
  }

  const segmentRpcValue = getHomeSegmentRpcValue(segmentSvgName);
  const rpcArgs = {
    p_profile_id: profile.data.id,
    p_search_text: filters?.searchValue?.trim() || null,
    p_start_date: filters?.startDate?.trim() || null,
    p_end_date: filters?.endDate?.trim() || null,
    p_category_ids:
      filters?.selectedCategoryIds && filters.selectedCategoryIds.length > 0
        ? filters.selectedCategoryIds
        : null,
    p_seller_interaction_states:
      filters?.selectedInteractionStates && filters.selectedInteractionStates.length > 0
        ? filters.selectedInteractionStates
        : null,
    p_stage_code: stageCode?.trim() || "for_you",
    p_page: normalizedPage,
    p_page_size: normalizedPageSize,
    ...(segmentRpcValue ? { p_segment_svg_name: segmentRpcValue } : {}),
  };

  const rpcResult: any = await (supabase as any).rpc(
    "get_seller_marketplace_hub_items",
    rpcArgs
  );

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  return {
    ok: true,
    data: extractMarketplaceHubItemsPage(
      rpcResult?.data,
      normalizedPage,
      normalizedPageSize
    ),
  };
}

export async function getCurrentBuyerMarketplaceHubItems(
  filters?: BuyerHomeFilters,
  segmentSvgName?: string,
  stageCode?: string,
  page?: number,
  pageSize?: number
): Promise<
  { ok: true; data: MarketplaceHubItemsPage } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };

  const normalizedPage = parsePositiveInteger(page, 1);
  const normalizedPageSize = parsePositiveInteger(pageSize, 20);
  if (!profile) {
    return {
      ok: true,
      data: extractMarketplaceHubItemsPage(null, normalizedPage, normalizedPageSize),
    };
  }

  const segmentRpcValue = getHomeSegmentRpcValue(segmentSvgName);
  const rpcArgs = {
    p_profile_id: profile.data.id,
    p_search_text: filters?.searchValue?.trim() || null,
    p_start_date: filters?.startDate?.trim() || null,
    p_end_date: filters?.endDate?.trim() || null,
    p_status_codes:
      filters?.selectedChipIds && filters.selectedChipIds.length > 0
        ? filters.selectedChipIds
        : null,
    p_stage_code: stageCode?.trim() || "all",
    p_page: normalizedPage,
    p_page_size: normalizedPageSize,
    ...(segmentRpcValue ? { p_segment_svg_name: segmentRpcValue } : {}),
  };

  const rpcResult: any = await (supabase as any).rpc(
    "get_buyer_marketplace_hub_items",
    rpcArgs
  );

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  return {
    ok: true,
    data: extractMarketplaceHubItemsPage(
      rpcResult?.data,
      normalizedPage,
      normalizedPageSize
    ),
  };
}

export async function addCurrentBuyerPurchaseRequestFavorite(
  purchaseRequestId: string
): Promise<
  { ok: true; data: AddPurchaseRequestFavoriteResult } | { ok: false; error: AppError }
> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const rpcResult: any = await (supabase as any).rpc(
    "add_buyer_purchase_request_favorite",
    {
      p_profile_id: profile.data.id,
      p_purchase_request_id: purchaseRequestId,
    }
  );

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  return { ok: true, data: mapAddPurchaseRequestFavoriteResult(rpcResult?.data) };
}

export async function removeCurrentBuyerPurchaseRequestFavorite(
  purchaseRequestId: string
): Promise<
  { ok: true; data: RemovePurchaseRequestFavoriteResult } | { ok: false; error: AppError }
> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const rpcResult: any = await (supabase as any).rpc(
    "remove_buyer_purchase_request_favorite",
    {
      p_profile_id: profile.data.id,
      p_purchase_request_id: purchaseRequestId,
    }
  );

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  return { ok: true, data: mapRemovePurchaseRequestFavoriteResult(rpcResult?.data) };
}

export async function addCurrentSellerPurchaseRequestFavorite(
  purchaseRequestId: string
): Promise<
  { ok: true; data: AddPurchaseRequestFavoriteResult } | { ok: false; error: AppError }
> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const rpcResult: any = await (supabase as any).rpc(
    "add_seller_purchase_request_favorite",
    {
      p_profile_id: profile.data.id,
      p_purchase_request_id: purchaseRequestId,
    }
  );

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  return { ok: true, data: mapAddPurchaseRequestFavoriteResult(rpcResult?.data) };
}

export async function removeCurrentSellerPurchaseRequestFavorite(
  purchaseRequestId: string
): Promise<
  { ok: true; data: RemovePurchaseRequestFavoriteResult } | { ok: false; error: AppError }
> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const rpcResult: any = await (supabase as any).rpc(
    "remove_seller_purchase_request_favorite",
    {
      p_profile_id: profile.data.id,
      p_purchase_request_id: purchaseRequestId,
    }
  );

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  return { ok: true, data: mapRemovePurchaseRequestFavoriteResult(rpcResult?.data) };
}

function buildPurchaseRequestFavoriteRpcArgs(
  profileId: string,
  filters?: PurchaseRequestFavoriteFilters,
  sortCode?: string
) {
  return {
    p_profile_id: profileId,
    p_search_text: filters?.searchValue?.trim() || null,
    p_start_date: filters?.startDate?.trim() || null,
    p_end_date: filters?.endDate?.trim() || null,
    p_category_ids:
      filters?.selectedCategoryIds && filters.selectedCategoryIds.length > 0
        ? filters.selectedCategoryIds
        : null,
    p_status_codes:
      filters?.selectedStatusCodes && filters.selectedStatusCodes.length > 0
        ? filters.selectedStatusCodes
        : null,
    p_sort_code: sortCode || "favorited_newest",
  };
}

async function getCurrentPurchaseRequestFavorites(
  rpcName: "get_buyer_purchase_request_favorites" | "get_seller_purchase_request_favorites",
  filters?: PurchaseRequestFavoriteFilters,
  sortCode?: string
): Promise<
  { ok: true; data: PurchaseRequestFavoriteItem[] } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const rpcResult: any = await (supabase as any).rpc(
    rpcName,
    buildPurchaseRequestFavoriteRpcArgs(profile.data.id, filters, sortCode)
  );

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  return { ok: true, data: extractPurchaseRequestFavoriteItems(rpcResult?.data) };
}

export async function getCurrentBuyerPurchaseRequestFavorites(
  filters?: PurchaseRequestFavoriteFilters,
  sortCode?: string
): Promise<
  { ok: true; data: PurchaseRequestFavoriteItem[] } | { ok: false; error: AppError }
> {
  return getCurrentPurchaseRequestFavorites(
    "get_buyer_purchase_request_favorites",
    filters,
    sortCode
  );
}

export async function getCurrentBuyerPurchaseRequestFavoriteStatus(
  purchaseRequestId: string
): Promise<{ ok: true; data: boolean } | { ok: false; error: AppError }> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };

  const favorites = await getCurrentBuyerPurchaseRequestFavorites();
  if (!favorites.ok) return favorites;

  return {
    ok: true,
    data: favorites.data.some((item) => item.id === purchaseRequestId),
  };
}

export async function getCurrentSellerPurchaseRequestFavorites(
  filters?: PurchaseRequestFavoriteFilters,
  sortCode?: string
): Promise<
  { ok: true; data: PurchaseRequestFavoriteItem[] } | { ok: false; error: AppError }
> {
  return getCurrentPurchaseRequestFavorites(
    "get_seller_purchase_request_favorites",
    filters,
    sortCode
  );
}

export async function getCurrentSellerHomeFilterCategoryOptions(
  segmentSvgName?: string
): Promise<
  { ok: true; data: SellerHomeFilterCategoryOption[] } | { ok: false; error: AppError }
> {
  const groupsResult = await getCurrentSellerHomePurchaseRequestGroups(undefined, segmentSvgName);
  if (!groupsResult.ok) return groupsResult;

  return {
    ok: true,
    data: buildFallbackSellerCategoryOptions(groupsResult.data),
  };
}

export async function getPurchaseRequestStatusUiOptions(): Promise<
  { ok: true; data: PurchaseRequestStatusUiOption[] } | { ok: false; error: AppError }
> {
  let { data, error } = await (supabase as any)
    .from("purchase_request_status_ui")
    .select("status_code, ui_text, style_code");

  if (error) {
    const legacyResult = await (supabase as any)
      .from("purchase_request_status_ui")
      .select("status_code, ui_text");

    if (legacyResult.error) return { ok: false, error: fromSupabaseError(error) };
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) return { ok: false, error: fromSupabaseError(error) };

  const rows = Array.isArray(data) ? data : [];
  const mapped = rows
    .map(mapPurchaseRequestStatusUiOption)
    .filter((item): item is PurchaseRequestStatusUiOption => item !== null);

  return { ok: true, data: mapped };
}
