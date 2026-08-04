import { RPC_FUNCTIONS } from "../db/functions";
import {
    COL_BUSINESS,
    COL_BUSINESS_CATEGORY_PREFERENCE,
    COL_BUSINESS_RATING_SUMMARY,
    COL_CATEGORY,
    COL_HOME_GROUP,
    COL_HOME_GROUP_PRESET,
    COL_HOME_GROUP_PRESET_ITEM,
    COL_LOCATION,
    COL_PROFILE,
    COL_PROFILE_BUSINESS,
    COL_PROFILE_HOME_GROUP_PRESET,
    COL_PROFILE_RATING_SUMMARY,
    COL_PURCHASE_OFFER,
    COL_PURCHASE_REQUEST,
    TB_BUSINESS,
    TB_BUSINESS_CATEGORY_PREFERENCE,
    TB_BUSINESS_RATING_SUMMARY,
    TB_CATEGORY,
    TB_HOME_GROUP,
    TB_HOME_GROUP_PRESET,
    TB_HOME_GROUP_PRESET_ITEM,
    TB_LOCATION,
    TB_PROFILE,
    TB_PROFILE_BUSINESS,
    TB_PROFILE_HOME_GROUP_PRESET,
    TB_PROFILE_RATING_SUMMARY,
    TB_PURCHASE_OFFER,
    TB_PURCHASE_REQUEST,
} from "../db/tables";
import { Row } from "../db/types";
import { supabase } from "../lib/supabase";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import {
    COSTA_RICA_PERSONAL_ID_ERROR,
    isValidCostaRicaPersonalId,
} from "../utils/costaRicaIdDocument";
import {
    getCurrentProfileResult,
    requestActiveProfileRefresh,
} from "./active.profile.service";
import {
    mapAccountDeletionRequestStatus,
    type AccountDeletionRequestStatus,
} from "./account.deletion.response";

export type { AccountDeletionRequestStatus } from "./account.deletion.response";

export type Profile = Row<"profile">;
export type ProfileEmailSetupStatus = {
    email: string | null;
    emailOptIn: boolean;
    emailOptInAt: string | null;
    isComplete: boolean;
};
export type SellerBusinessCategorySetupStatus = {
    businessId: string | null;
    categoryCount: number;
    isComplete: boolean;
};
export type BuyerProfileStats = {
    purchaseRequestsCount: number;
    offersReceivedCount: number;
    rating: number | null;
    numRatings: number;
};
export type BuyerHomePresetSummary = {
    id: string;
    code: string;
    name: string;
    description: string | null;
};
export type HomePresetSurface = "buyer_home" | "seller_home";
export type HomePresetSummary = BuyerHomePresetSummary;
export type HomePresetPreviewGroup = {
    code: string;
    name: string;
    description: string | null;
    maxItems: number;
    sortOrder: number;
};
export type BuyerHomePresetPreviewGroup = HomePresetPreviewGroup;
export type HomePresetOption = HomePresetSummary & {
    isCurrent: boolean;
    groups: HomePresetPreviewGroup[];
};
export type BuyerHomePresetOption = HomePresetOption;
export type BuyerProfileOverview = {
    profile: Profile;
    stats: BuyerProfileStats;
    buyerHomePreset: BuyerHomePresetSummary | null;
};
export type SellerBusinessCategoryPreference = {
    id: string;
    categoryId: string;
    categoryName: string;
    categoryPath: string | null;
};
export type BusinessCategoryOption = {
    id: string;
    name: string;
    path: string | null;
};
export type SellerBusinessLocation = {
    id: string;
    province: string | null;
    canton: string | null;
    district: string | null;
};
export type SellerBusinessOverview = {
    id: string;
    name: string | null;
    idDocument: string | null;
    createdAt: string;
    rating: number | null;
    numRatings: number;
    location: SellerBusinessLocation | null;
    categoryPreferences: SellerBusinessCategoryPreference[];
};
export type SellerProfileOverview = {
    profile: Profile;
    business: SellerBusinessOverview | null;
    sellerHomePreset: HomePresetSummary | null;
};
export type ProfileEditableField = "name" | "id_document";

function normalizeProfileEmail(email: string) {
    return email.trim().toLowerCase();
}

function mapProfileEmailVerificationError(error: unknown): AppError {
    const value = error && typeof error === "object"
        ? error as Record<string, unknown>
        : null;
    const rawMessage = typeof value?.message === "string" ? value.message : "";

    if (rawMessage.includes("email_already_in_use")) {
        return {
            type: "validation",
            code: "email_already_in_use",
            message: "Este correo ya está en uso.",
        };
    }

    return fromSupabaseError(error);
}

function mapProfileEmailSetupStatus(profile: Profile | null): ProfileEmailSetupStatus {
    const email = typeof profile?.email === "string" ? profile.email.trim() : "";
    const emailOptIn = profile?.email_opt_in === true;
    const emailOptInAt =
        typeof profile?.email_opt_in_at === "string" && profile.email_opt_in_at.length > 0
            ? profile.email_opt_in_at
            : null;

    return {
        email: email || null,
        emailOptIn,
        emailOptInAt,
        isComplete: Boolean(email) && emailOptIn && emailOptInAt !== null,
    };
}

function toRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object"
        ? value as Record<string, unknown>
        : null;
}

function hasJsonResponse(
    value: unknown
): value is { json: () => Promise<unknown>; clone?: () => unknown } {
    return Boolean(value) &&
        typeof (value as { json?: unknown }).json === "function";
}

async function mapAccountDeletionFunctionError(error: unknown): Promise<AppError> {
    const context = toRecord(error)?.context;
    let payload: Record<string, unknown> | null = null;

    if (hasJsonResponse(context)) {
        try {
            const response =
                typeof context.clone === "function" ? context.clone() : context;
            payload = toRecord(
                await (hasJsonResponse(response) ? response : context).json()
            );
        } catch {
            payload = null;
        }
    }

    const code =
        typeof payload?.error_code === "string"
            ? payload.error_code.trim()
            : "";
    return code
        ? fromSupabaseError({ error_code: code, code, message: code })
        : fromSupabaseError(error);
}

function formatCategoryPath(path: unknown): string | null {
    if (typeof path === "string") return path;
    if (Array.isArray(path)) {
        const parts = path
            .map((part) => (typeof part === "string" ? part.trim() : ""))
            .filter(Boolean);
        return parts.length > 0 ? parts.join(" / ") : null;
    }

    return null;
}

async function getCurrentAuthenticatedProfile(): Promise<
    { ok: true; data: Profile } | { ok: false; error: AppError }
> {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { ok: false, error: fromSupabaseError(error) };

    const userId = data.session?.user.id;
    if (!userId) {
        return { ok: false, error: fromAppError("auth") };
    }

    const profileResult = await getCurrentProfileResult();
    if (profileResult?.ok === false) return { ok: false, error: profileResult.error };
    if (!profileResult || profileResult.ok !== true) {
        return { ok: false, error: fromAppError("not_found") };
    }

    return { ok: true, data: profileResult.data };
}

export async function getProfileById(id: string): Promise<{ok: true; data: Profile} | {ok: false; error: AppError} | null > {
    const { data, error } = await supabase
        .from(TB_PROFILE)
        .select("*")
        .eq(COL_PROFILE.id, id)
        .maybeSingle();
    if (error) return {ok: false, error: fromSupabaseError(error) };
    if (!data) return null;
    return { ok: true, data: data as Profile };
}

async function getProfileHomePresetSummary(
    profileId: string,
    surface: HomePresetSurface
): Promise<
    { ok: true; data: HomePresetSummary | null } | { ok: false; error: AppError }
> {
    const assignmentResult = await supabase
        .from(TB_PROFILE_HOME_GROUP_PRESET)
        .select("preset_id")
        .eq(COL_PROFILE_HOME_GROUP_PRESET.profile_id, profileId)
        .maybeSingle();

    if (assignmentResult.error) {
        return { ok: false, error: fromSupabaseError(assignmentResult.error) };
    }

    const getPresetById = (presetId: string) =>
        supabase
            .from(TB_HOME_GROUP_PRESET)
            .select("id,code,name,description")
            .eq(COL_HOME_GROUP_PRESET.surface_code, surface)
            .eq(COL_HOME_GROUP_PRESET.is_active, true)
            .eq(COL_HOME_GROUP_PRESET.id, presetId)
            .maybeSingle();

    const assignedPresetId = assignmentResult.data?.preset_id ?? null;
    const presetResult = assignedPresetId
        ? await getPresetById(assignedPresetId)
        : await supabase
            .from(TB_HOME_GROUP_PRESET)
            .select("id,code,name,description")
            .eq(COL_HOME_GROUP_PRESET.surface_code, surface)
            .eq(COL_HOME_GROUP_PRESET.is_active, true)
            .eq(COL_HOME_GROUP_PRESET.code, "default")
            .maybeSingle();

    if (presetResult.error) {
        return { ok: false, error: fromSupabaseError(presetResult.error) };
    }

    if (presetResult.data) {
        return {
            ok: true,
            data: {
                id: presetResult.data.id,
                code: presetResult.data.code,
                name: presetResult.data.name,
                description: presetResult.data.description,
            },
        };
    }

    const fallbackResult = await supabase
        .from(TB_HOME_GROUP_PRESET)
        .select("id,code,name,description")
        .eq(COL_HOME_GROUP_PRESET.surface_code, surface)
        .eq(COL_HOME_GROUP_PRESET.is_active, true)
        .eq(COL_HOME_GROUP_PRESET.code, "default")
        .maybeSingle();

    if (fallbackResult.error) {
        return { ok: false, error: fromSupabaseError(fallbackResult.error) };
    }

    return {
        ok: true,
        data: fallbackResult.data
            ? {
                id: fallbackResult.data.id,
                code: fallbackResult.data.code,
                name: fallbackResult.data.name,
                description: fallbackResult.data.description,
            }
            : null,
    };
}

async function getCurrentProfileHomePresetOptions(
    surface: HomePresetSurface
): Promise<
    { ok: true; data: HomePresetOption[] } | { ok: false; error: AppError }
> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const presetResult = await supabase
        .from(TB_HOME_GROUP_PRESET)
        .select("id,code,name,description")
        .eq(COL_HOME_GROUP_PRESET.surface_code, surface)
        .eq(COL_HOME_GROUP_PRESET.is_active, true)
        .order(COL_HOME_GROUP_PRESET.created_at, { ascending: true });

    if (presetResult.error) {
        return { ok: false, error: fromSupabaseError(presetResult.error) };
    }

    const presets = presetResult.data ?? [];
    const presetIds = presets.map((preset) => preset.id);

    const assignmentResult = await supabase
        .from(TB_PROFILE_HOME_GROUP_PRESET)
        .select("preset_id")
        .eq(COL_PROFILE_HOME_GROUP_PRESET.profile_id, profileResult.data.id)
        .maybeSingle();

    if (assignmentResult.error) {
        return { ok: false, error: fromSupabaseError(assignmentResult.error) };
    }

    const assignedPresetId = assignmentResult.data?.preset_id ?? null;
    const fallbackPreset = presets.find((preset) => preset.code === "default") ?? presets[0] ?? null;
    const hasAssignedPreset = presets.some((preset) => preset.id === assignedPresetId);
    const currentPresetId =
        hasAssignedPreset
            ? assignedPresetId
            : fallbackPreset?.id ?? null;

    let presetItems: Row<"home_group_preset_item">[] = [];
    if (presetIds.length > 0) {
        const itemResult = await supabase
            .from(TB_HOME_GROUP_PRESET_ITEM)
            .select("*")
            .in(COL_HOME_GROUP_PRESET_ITEM.preset_id, presetIds)
            .order(COL_HOME_GROUP_PRESET_ITEM.sort_order, { ascending: true });

        if (itemResult.error) {
            return { ok: false, error: fromSupabaseError(itemResult.error) };
        }

        presetItems = itemResult.data ?? [];
    }

    const groupIds = Array.from(new Set(presetItems.map((item) => item.group_id)));
    const groupById = new Map<string, Row<"home_group">>();

    if (groupIds.length > 0) {
        const groupResult = await supabase
            .from(TB_HOME_GROUP)
            .select("*")
            .in(COL_HOME_GROUP.id, groupIds)
            .eq(COL_HOME_GROUP.surface_code, surface)
            .eq(COL_HOME_GROUP.is_active, true);

        if (groupResult.error) {
            return { ok: false, error: fromSupabaseError(groupResult.error) };
        }

        for (const group of groupResult.data ?? []) {
            groupById.set(group.id, group);
        }
    }

    const groupsByPresetId = new Map<string, HomePresetPreviewGroup[]>();
    for (const item of presetItems) {
        const group = groupById.get(item.group_id);
        if (!group) continue;

        const groups = groupsByPresetId.get(item.preset_id) ?? [];
        groups.push({
            code: group.code,
            name: group.name,
            description: group.description,
            maxItems: item.max_items,
            sortOrder: item.sort_order,
        });
        groupsByPresetId.set(item.preset_id, groups);
    }

    return {
        ok: true,
        data: presets.map((preset) => ({
            id: preset.id,
            code: preset.code,
            name: preset.name,
            description: preset.description,
            isCurrent: preset.id === currentPresetId,
            groups: (groupsByPresetId.get(preset.id) ?? []).sort(
                (a, b) => a.sortOrder - b.sortOrder
            ),
        })),
    };
}

export async function getCurrentBuyerHomePresetOptions(): Promise<
    { ok: true; data: BuyerHomePresetOption[] } | { ok: false; error: AppError }
> {
    return await getCurrentProfileHomePresetOptions("buyer_home");
}

export async function getCurrentSellerHomePresetOptions(): Promise<
    { ok: true; data: HomePresetOption[] } | { ok: false; error: AppError }
> {
    return await getCurrentProfileHomePresetOptions("seller_home");
}

export async function getCurrentBusinessCategoryOptions(): Promise<
    { ok: true; data: BusinessCategoryOption[] } | { ok: false; error: AppError }
> {
    const categoryResult = await supabase
        .from(TB_CATEGORY)
        .select("id,name,path")
        .order(COL_CATEGORY.name, { ascending: true });

    if (categoryResult.error) {
        return { ok: false, error: fromSupabaseError(categoryResult.error) };
    }

    return {
        ok: true,
        data: (categoryResult.data ?? []).map((category) => ({
            id: category.id,
            name: category.name,
            path: formatCategoryPath(category.path),
        })),
    };
}

export async function updateCurrentBusinessCategoryPreferences(
    categoryIds: string[]
): Promise<{ ok: true; data: { categoryIds: string[] } } | { ok: false; error: AppError }> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const uniqueCategoryIds = Array.from(
        new Set(categoryIds.map((categoryId) => categoryId.trim()).filter(Boolean))
    );

    const rpcResult = await supabase.rpc(
        RPC_FUNCTIONS.SET_CURRENT_BUSINESS_CATEGORY_PREFERENCES,
        {
            p_profile_id: profileResult.data.id,
            p_category_ids: uniqueCategoryIds,
        }
    );

    if (rpcResult?.error) {
        return { ok: false, error: fromSupabaseError(rpcResult.error) };
    }

    const rpcData =
        rpcResult.data && typeof rpcResult.data === "object" && !Array.isArray(rpcResult.data)
            ? rpcResult.data
            : null;
    const returnedCategoryIds = Array.isArray(rpcData?.category_ids)
        ? rpcData.category_ids.filter(
            (categoryId: unknown): categoryId is string => typeof categoryId === "string"
        )
        : uniqueCategoryIds;

    return {
        ok: true,
        data: {
            categoryIds: returnedCategoryIds,
        },
    };
}

export async function updateCurrentBusinessLocation(
    locationId: string
): Promise<{ ok: true; data: { locationId: string } } | { ok: false; error: AppError }> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const normalizedLocationId = locationId.trim();
    if (!normalizedLocationId) {
        return { ok: false, error: fromAppError("validation") };
    }

    const rpcResult = await supabase.rpc(
        RPC_FUNCTIONS.SET_CURRENT_BUSINESS_LOCATION,
        {
            p_profile_id: profileResult.data.id,
            p_location_id: normalizedLocationId,
        }
    );

    if (rpcResult?.error) {
        return { ok: false, error: fromSupabaseError(rpcResult.error) };
    }

    const rpcData =
        rpcResult.data && typeof rpcResult.data === "object" && !Array.isArray(rpcResult.data)
            ? rpcResult.data
            : null;
    const returnedLocationId =
        typeof rpcData?.location_id === "string"
            ? rpcData.location_id
            : normalizedLocationId;

    return {
        ok: true,
        data: {
            locationId: returnedLocationId,
        },
    };
}

async function getBuyerProfileStats(profileId: string): Promise<
    { ok: true; data: BuyerProfileStats } | { ok: false; error: AppError }
> {
    const requestResult = await supabase
        .from(TB_PURCHASE_REQUEST)
        .select("id", { count: "exact" })
        .eq(COL_PURCHASE_REQUEST.profile_id, profileId);

    if (requestResult.error) {
        return { ok: false, error: fromSupabaseError(requestResult.error) };
    }

    const purchaseRequestIds = (requestResult.data ?? [])
        .map((row) => row.id)
        .filter((id): id is string => Boolean(id));

    let offersReceivedCount = 0;
    if (purchaseRequestIds.length > 0) {
        const offerResult = await supabase
            .from(TB_PURCHASE_OFFER)
            .select("id", { count: "exact", head: true })
            .in(COL_PURCHASE_OFFER.purchase_request_id, purchaseRequestIds);

        if (offerResult.error) {
            return { ok: false, error: fromSupabaseError(offerResult.error) };
        }

        offersReceivedCount = offerResult.count ?? 0;
    }

    const ratingResult = await supabase
        .from(TB_PROFILE_RATING_SUMMARY)
        .select("rating,num_ratings")
        .eq(COL_PROFILE_RATING_SUMMARY.profile_id, profileId)
        .maybeSingle();

    if (ratingResult.error) {
        return { ok: false, error: fromSupabaseError(ratingResult.error) };
    }

    return {
        ok: true,
        data: {
            purchaseRequestsCount: requestResult.count ?? purchaseRequestIds.length,
            offersReceivedCount,
            rating:
                typeof ratingResult.data?.rating === "number"
                    ? ratingResult.data.rating
                    : null,
            numRatings:
                typeof ratingResult.data?.num_ratings === "number"
                    ? ratingResult.data.num_ratings
                    : 0,
        },
    };
}

export async function getCurrentBuyerProfileOverview(): Promise<
    { ok: true; data: BuyerProfileOverview } | { ok: false; error: AppError }
> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const statsResult = await getBuyerProfileStats(profileResult.data.id);
    if (!statsResult.ok) return statsResult;

    const presetResult = await getProfileHomePresetSummary(profileResult.data.id, "buyer_home");
    if (!presetResult.ok) return presetResult;

    return {
        ok: true,
        data: {
            profile: profileResult.data,
            stats: statsResult.data,
            buyerHomePreset: presetResult.data,
        },
    };
}

async function getSellerBusinessOverview(profileId: string): Promise<
    { ok: true; data: SellerBusinessOverview | null } | { ok: false; error: AppError }
> {
    const profileBusinessResult = await supabase
        .from(TB_PROFILE_BUSINESS)
        .select("business_id")
        .eq(COL_PROFILE_BUSINESS.profile_id, profileId)
        .maybeSingle();

    if (profileBusinessResult.error) {
        return { ok: false, error: fromSupabaseError(profileBusinessResult.error) };
    }

    const businessId = profileBusinessResult.data?.business_id;
    if (!businessId) {
        return { ok: true, data: null };
    }

    const businessResult = await supabase
        .from(TB_BUSINESS)
        .select("*")
        .eq(COL_BUSINESS.id, businessId)
        .maybeSingle();

    if (businessResult.error) {
        return { ok: false, error: fromSupabaseError(businessResult.error) };
    }

    if (!businessResult.data) {
        return { ok: true, data: null };
    }

    const ratingResult = await supabase
        .from(TB_BUSINESS_RATING_SUMMARY)
        .select("rating,num_ratings")
        .eq(COL_BUSINESS_RATING_SUMMARY.business_id, businessId)
        .maybeSingle();

    if (ratingResult.error) {
        return { ok: false, error: fromSupabaseError(ratingResult.error) };
    }

    let location: SellerBusinessLocation | null = null;
    if (businessResult.data.location_id) {
        const locationResult = await supabase
            .from(TB_LOCATION)
            .select("id,province,canton,district")
            .eq(COL_LOCATION.id, businessResult.data.location_id)
            .maybeSingle();

        if (locationResult.error) {
            return { ok: false, error: fromSupabaseError(locationResult.error) };
        }

        location = locationResult.data
            ? {
                id: locationResult.data.id,
                province: locationResult.data.province,
                canton: locationResult.data.canton,
                district: locationResult.data.district,
            }
            : null;
    }

    const preferenceResult = await supabase
        .from(TB_BUSINESS_CATEGORY_PREFERENCE)
        .select("id,category_id")
        .eq(COL_BUSINESS_CATEGORY_PREFERENCE.business_id, businessId);

    if (preferenceResult.error) {
        return { ok: false, error: fromSupabaseError(preferenceResult.error) };
    }

    const preferences = preferenceResult.data ?? [];
    const categoryIds = Array.from(new Set(preferences.map((preference) => preference.category_id)));
    const categoriesById = new Map<string, { name: string; path: unknown }>();

    if (categoryIds.length > 0) {
        const categoryResult = await supabase
            .from(TB_CATEGORY)
            .select("id,name,path")
            .in(COL_CATEGORY.id, categoryIds);

        if (categoryResult.error) {
            return { ok: false, error: fromSupabaseError(categoryResult.error) };
        }

        for (const category of categoryResult.data ?? []) {
            categoriesById.set(category.id, {
                name: category.name,
                path: category.path,
            });
        }
    }

    return {
        ok: true,
        data: {
            id: businessResult.data.id,
            name: businessResult.data.name,
            idDocument: businessResult.data.id_document,
            createdAt: businessResult.data.created_at,
            rating:
                typeof ratingResult.data?.rating === "number"
                    ? ratingResult.data.rating
                    : null,
            numRatings:
                typeof ratingResult.data?.num_ratings === "number"
                    ? ratingResult.data.num_ratings
                    : 0,
            location,
            categoryPreferences: preferences.map((preference) => {
                const category = categoriesById.get(preference.category_id);
                return {
                    id: preference.id,
                    categoryId: preference.category_id,
                    categoryName: category?.name ?? "Categoría sin nombre",
                    categoryPath: formatCategoryPath(category?.path),
                };
            }),
        },
    };
}

export async function getCurrentSellerProfileOverview(): Promise<
    { ok: true; data: SellerProfileOverview } | { ok: false; error: AppError }
> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const businessResult = await getSellerBusinessOverview(profileResult.data.id);
    if (!businessResult.ok) return businessResult;

    const presetResult = await getProfileHomePresetSummary(
        profileResult.data.id,
        "seller_home"
    );
    if (!presetResult.ok) return presetResult;

    return {
        ok: true,
        data: {
            profile: profileResult.data,
            business: businessResult.data,
            sellerHomePreset: presetResult.data,
        },
    };
}

export async function getCurrentSellerBusinessCategorySetupStatus(): Promise<
    { ok: true; data: SellerBusinessCategorySetupStatus } | { ok: false; error: AppError }
> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const profileBusinessResult = await supabase
        .from(TB_PROFILE_BUSINESS)
        .select("business_id")
        .eq(COL_PROFILE_BUSINESS.profile_id, profileResult.data.id)
        .maybeSingle();

    if (profileBusinessResult.error) {
        return { ok: false, error: fromSupabaseError(profileBusinessResult.error) };
    }

    const businessId = profileBusinessResult.data?.business_id ?? null;
    if (!businessId) {
        return {
            ok: true,
            data: {
                businessId: null,
                categoryCount: 0,
                isComplete: false,
            },
        };
    }

    const preferenceResult = await supabase
        .from(TB_BUSINESS_CATEGORY_PREFERENCE)
        .select("id", { count: "exact", head: true })
        .eq(COL_BUSINESS_CATEGORY_PREFERENCE.business_id, businessId);

    if (preferenceResult.error) {
        return { ok: false, error: fromSupabaseError(preferenceResult.error) };
    }

    const categoryCount = preferenceResult.count ?? 0;

    return {
        ok: true,
        data: {
            businessId,
            categoryCount,
            isComplete: categoryCount > 0,
        },
    };
}

export async function updateCurrentProfileField(
    field: ProfileEditableField,
    value: string
): Promise<{ ok: true; data: Profile } | { ok: false; error: AppError }> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const normalizedValue = value.trim();
    if (!normalizedValue) {
        return { ok: false, error: fromAppError("validation") };
    }
    if (field === "id_document" && !isValidCostaRicaPersonalId(value)) {
        return {
            ok: false,
            error: { type: "validation", message: COSTA_RICA_PERSONAL_ID_ERROR },
        };
    }

    const { data, error } = await supabase
        .from(TB_PROFILE)
        .update({ [field]: normalizedValue })
        .eq(COL_PROFILE.id, profileResult.data.id)
        .select("*")
        .single();

    if (error) return { ok: false, error: fromSupabaseError(error) };
    void requestActiveProfileRefresh(profileResult.data.id);
    return { ok: true, data: data as Profile };
}

export async function updateCurrentBuyerHomePreset(
    presetId: string
): Promise<{ ok: true; data: BuyerHomePresetSummary } | { ok: false; error: AppError }> {
    return await updateCurrentProfileHomePreset("buyer_home", presetId);
}

export async function updateCurrentSellerHomePreset(
    presetId: string
): Promise<{ ok: true; data: HomePresetSummary } | { ok: false; error: AppError }> {
    return await updateCurrentProfileHomePreset("seller_home", presetId);
}

async function updateCurrentProfileHomePreset(
    surface: HomePresetSurface,
    presetId: string
): Promise<{ ok: true; data: HomePresetSummary } | { ok: false; error: AppError }> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const presetResult = await supabase
        .from(TB_HOME_GROUP_PRESET)
        .select("id,code,name,description")
        .eq(COL_HOME_GROUP_PRESET.id, presetId)
        .eq(COL_HOME_GROUP_PRESET.surface_code, surface)
        .eq(COL_HOME_GROUP_PRESET.is_active, true)
        .maybeSingle();

    if (presetResult.error) {
        return { ok: false, error: fromSupabaseError(presetResult.error) };
    }

    if (!presetResult.data) {
        return { ok: false, error: fromAppError("validation") };
    }

    const { error } = await supabase
        .from(TB_PROFILE_HOME_GROUP_PRESET)
        .upsert(
            {
                profile_id: profileResult.data.id,
                preset_id: presetResult.data.id,
            },
            { onConflict: COL_PROFILE_HOME_GROUP_PRESET.profile_id }
        );

    if (error) return { ok: false, error: fromSupabaseError(error) };

    return {
        ok: true,
        data: {
            id: presetResult.data.id,
            code: presetResult.data.code,
            name: presetResult.data.name,
            description: presetResult.data.description,
        },
    };
}

export function getProfileEmailSetupStatus(profile: Profile | null): ProfileEmailSetupStatus {
    return mapProfileEmailSetupStatus(profile);
}

export async function getCurrentProfileEmailSetupStatus(): Promise<
    { ok: true; data: ProfileEmailSetupStatus } | { ok: false; error: AppError }
> {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { ok: false, error: fromSupabaseError(error) };

    const userId = data.session?.user.id;
    if (!userId) {
        return {
            ok: true,
            data: mapProfileEmailSetupStatus(null),
        };
    }

    const profile = await getCurrentProfileResult();
    if (profile?.ok === false) return { ok: false, error: profile.error };

    return {
        ok: true,
        data: mapProfileEmailSetupStatus(profile?.ok === true ? profile.data : null),
    };
}

type RequestCurrentProfileEmailSetupVerificationInput = {
    email: string;
};

async function sendCurrentProfileEmailSetupVerificationOtp(email: string): Promise<
    { ok: true; data: { email: string } } | { ok: false; error: AppError }
> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const normalizedEmail = normalizeProfileEmail(email);
    if (!normalizedEmail) {
        return { ok: false, error: fromAppError("validation") };
    }

    const rpcResult = await supabase.rpc(
        RPC_FUNCTIONS.SEND_EMAIL_VERIFICATION_OTP,
        {
            p_profile_id: profileResult.data.id,
            p_email: normalizedEmail,
        }
    );

    if (rpcResult?.error) {
        return { ok: false, error: mapProfileEmailVerificationError(rpcResult.error) };
    }

    return {
        ok: true,
        data: {
            email: normalizedEmail,
        },
    };
}

export async function requestCurrentProfileEmailSetupVerification({
    email,
}: RequestCurrentProfileEmailSetupVerificationInput): Promise<
    { ok: true; data: { email: string } } | { ok: false; error: AppError }
> {
    return await sendCurrentProfileEmailSetupVerificationOtp(email);
}

type ResendCurrentProfileEmailSetupVerificationInput = {
    email: string;
};

export async function resendCurrentProfileEmailSetupVerification({
    email,
}: ResendCurrentProfileEmailSetupVerificationInput): Promise<
    { ok: true; data: { email: string } } | { ok: false; error: AppError }
> {
    return await sendCurrentProfileEmailSetupVerificationOtp(email);
}

type VerifyCurrentProfileEmailSetupInput = {
    email: string;
    token: string;
    emailOptIn: boolean;
};

export async function verifyCurrentProfileEmailSetup({
    email,
    token,
    emailOptIn,
}: VerifyCurrentProfileEmailSetupInput): Promise<
    { ok: true; data: ProfileEmailSetupStatus } | { ok: false; error: AppError }
> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const normalizedEmail = normalizeProfileEmail(email);
    const normalizedToken = token.trim();

    if (!normalizedEmail || !normalizedToken) {
        return { ok: false, error: fromAppError("validation") };
    }

    const rpcResult = await supabase.rpc(
        RPC_FUNCTIONS.VERIFY_EMAIL_VERIFICATION_OTP,
        {
            p_profile_id: profileResult.data.id,
            p_email: normalizedEmail,
            p_code: normalizedToken,
            p_email_opt_in: emailOptIn,
        }
    );

    if (rpcResult?.error) {
        return { ok: false, error: mapProfileEmailVerificationError(rpcResult.error) };
    }

    const rpcData =
        rpcResult.data && typeof rpcResult.data === "object" && !Array.isArray(rpcResult.data)
            ? rpcResult.data
            : null;
    if (rpcData?.ok === false) {
        const errorCode =
            typeof rpcData.error === "string"
                ? rpcData.error
                : "invalid_otp_code";
        const message =
            errorCode === "otp_attempt_limit_reached"
                ? "Superaste el número de intentos. Solicita un código nuevo."
                : errorCode === "otp_expired"
                  ? "El código venció. Solicita uno nuevo."
                  : "El código ingresado no es válido.";
        return {
            ok: false,
            error: {
                type: "validation",
                code: errorCode,
                message,
            },
        };
    }

    void requestActiveProfileRefresh(profileResult.data.id);
    return await getCurrentProfileEmailSetupStatus();
}

export async function requestCurrentLoginDeletion(): Promise<
    { ok: true; data: AccountDeletionRequestStatus } | { ok: false; error: AppError }
> {
    const functionResult = await supabase.functions.invoke(
        "request-account-deletion",
        {
            body: {
                channel: "APP",
                confirmed: true,
            },
        }
    );

    if (functionResult.error) {
        return {
            ok: false,
            error: await mapAccountDeletionFunctionError(functionResult.error),
        };
    }

    const status = mapAccountDeletionRequestStatus(functionResult.data);
    if (!status) {
        return { ok: false, error: fromAppError("validation") };
    }

    return {
        ok: true,
        data: status,
    };
}

export async function requestCurrentProfileDeletion(): Promise<
    { ok: true; data: AccountDeletionRequestStatus } | { ok: false; error: AppError }
> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const functionResult = await supabase.functions.invoke(
        "request-profile-deletion",
        {
            body: {
                profileId: profileResult.data.id,
                channel: "APP",
                confirmed: true,
            },
        }
    );

    if (functionResult.error) {
        return {
            ok: false,
            error: await mapAccountDeletionFunctionError(functionResult.error),
        };
    }

    const status = mapAccountDeletionRequestStatus(functionResult.data);
    if (!status) return { ok: false, error: fromAppError("validation") };
    return { ok: true, data: status };
}
