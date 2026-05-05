import { Row } from "../db/types";
import { supabase } from "../lib/supabase";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";

export type Profile = Row<"profile">;
export type ProfileEmailSetupStatus = {
    email: string | null;
    emailOptIn: boolean;
    emailOptInAt: string | null;
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

    const profileResult = await getProfileByUserId(userId);
    if (profileResult?.ok === false) return { ok: false, error: profileResult.error };
    if (!profileResult || profileResult.ok !== true) {
        return { ok: false, error: fromAppError("not_found") };
    }

    return { ok: true, data: profileResult.data };
}

export async function createProfile(profile : Profile): Promise<{ok: true; data: Profile} | {ok: false; error: AppError}> {
    const { id: _omit, ...insertData } = profile;
    const { data, error } = await supabase
        .from("profile")
        .insert(insertData)
        .select()
        .single();
    if (error) return {ok: false, error: fromSupabaseError(error) };
    return { ok: true, data: data as Profile };
}

export async function getProfileByPhone(phone: string): Promise<{ok: true; data: Profile} | {ok: false; error: AppError} | null > {
    const { data, error } = await supabase
        .from("profile")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();
    if (error) return {ok: false, error: fromSupabaseError(error) };
    if (!data) return null;
    return { ok: true, data: data as Profile };
}

export async function getProfileById(id: string): Promise<{ok: true; data: Profile} | {ok: false; error: AppError} | null > {
    const { data, error } = await supabase
        .from("profile")
        .select("*")
        .eq("id", id)
        .maybeSingle();
    if (error) return {ok: false, error: fromSupabaseError(error) };
    if (!data) return null;
    return { ok: true, data: data as Profile };
}

export async function getProfileByUserId(userId: string): Promise<{ok: true; data: Profile} | {ok: false; error: AppError} | null > {
    const { data, error } = await supabase
        .from("profile")
        .select("*")
        .eq("user_id", userId)
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
        .from("profile_home_group_preset")
        .select("preset_id")
        .eq("profile_id", profileId)
        .maybeSingle();

    if (assignmentResult.error) {
        return { ok: false, error: fromSupabaseError(assignmentResult.error) };
    }

    const getPresetById = (presetId: string) =>
        supabase
            .from("home_group_preset")
            .select("id,code,name,description")
            .eq("surface_code", surface)
            .eq("is_active", true)
            .eq("id", presetId)
            .maybeSingle();

    const assignedPresetId = assignmentResult.data?.preset_id ?? null;
    const presetResult = assignedPresetId
        ? await getPresetById(assignedPresetId)
        : await supabase
            .from("home_group_preset")
            .select("id,code,name,description")
            .eq("surface_code", surface)
            .eq("is_active", true)
            .eq("code", "default")
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
        .from("home_group_preset")
        .select("id,code,name,description")
        .eq("surface_code", surface)
        .eq("is_active", true)
        .eq("code", "default")
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
        .from("home_group_preset")
        .select("id,code,name,description")
        .eq("surface_code", surface)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

    if (presetResult.error) {
        return { ok: false, error: fromSupabaseError(presetResult.error) };
    }

    const presets = presetResult.data ?? [];
    const presetIds = presets.map((preset) => preset.id);

    const assignmentResult = await supabase
        .from("profile_home_group_preset")
        .select("preset_id")
        .eq("profile_id", profileResult.data.id)
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
            .from("home_group_preset_item")
            .select("*")
            .in("preset_id", presetIds)
            .order("sort_order", { ascending: true });

        if (itemResult.error) {
            return { ok: false, error: fromSupabaseError(itemResult.error) };
        }

        presetItems = itemResult.data ?? [];
    }

    const groupIds = Array.from(new Set(presetItems.map((item) => item.group_id)));
    const groupById = new Map<string, Row<"home_group">>();

    if (groupIds.length > 0) {
        const groupResult = await supabase
            .from("home_group")
            .select("*")
            .in("id", groupIds)
            .eq("surface_code", surface)
            .eq("is_active", true);

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
        .from("category")
        .select("id,name,path")
        .order("name", { ascending: true });

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

    const rpcResult: any = await (supabase as any).rpc(
        "set_current_business_category_preferences",
        {
            p_profile_id: profileResult.data.id,
            p_category_ids: uniqueCategoryIds,
        }
    );

    if (rpcResult?.error) {
        return { ok: false, error: fromSupabaseError(rpcResult.error) };
    }

    const returnedCategoryIds = Array.isArray(rpcResult?.data?.category_ids)
        ? rpcResult.data.category_ids.filter(
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

async function getBuyerProfileStats(profileId: string): Promise<
    { ok: true; data: BuyerProfileStats } | { ok: false; error: AppError }
> {
    const requestResult = await supabase
        .from("purchase_request")
        .select("id", { count: "exact" })
        .eq("profile_id", profileId);

    if (requestResult.error) {
        return { ok: false, error: fromSupabaseError(requestResult.error) };
    }

    const purchaseRequestIds = (requestResult.data ?? [])
        .map((row) => row.id)
        .filter((id): id is string => Boolean(id));

    let offersReceivedCount = 0;
    if (purchaseRequestIds.length > 0) {
        const offerResult = await supabase
            .from("purchase_offer")
            .select("id", { count: "exact", head: true })
            .in("purchase_request_id", purchaseRequestIds);

        if (offerResult.error) {
            return { ok: false, error: fromSupabaseError(offerResult.error) };
        }

        offersReceivedCount = offerResult.count ?? 0;
    }

    const ratingResult = await supabase
        .from("profile_rating_summary")
        .select("rating,num_ratings")
        .eq("profile_id", profileId)
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
        .from("profile_business")
        .select("business_id")
        .eq("profile_id", profileId)
        .maybeSingle();

    if (profileBusinessResult.error) {
        return { ok: false, error: fromSupabaseError(profileBusinessResult.error) };
    }

    const businessId = profileBusinessResult.data?.business_id;
    if (!businessId) {
        return { ok: true, data: null };
    }

    const businessResult = await supabase
        .from("business")
        .select("*")
        .eq("id", businessId)
        .maybeSingle();

    if (businessResult.error) {
        return { ok: false, error: fromSupabaseError(businessResult.error) };
    }

    if (!businessResult.data) {
        return { ok: true, data: null };
    }

    const ratingResult = await supabase
        .from("business_rating_summary")
        .select("rating,num_ratings")
        .eq("business_id", businessId)
        .maybeSingle();

    if (ratingResult.error) {
        return { ok: false, error: fromSupabaseError(ratingResult.error) };
    }

    let location: SellerBusinessLocation | null = null;
    if (businessResult.data.location_id) {
        const locationResult = await supabase
            .from("location")
            .select("province,canton,district")
            .eq("id", businessResult.data.location_id)
            .maybeSingle();

        if (locationResult.error) {
            return { ok: false, error: fromSupabaseError(locationResult.error) };
        }

        location = locationResult.data
            ? {
                province: locationResult.data.province,
                canton: locationResult.data.canton,
                district: locationResult.data.district,
            }
            : null;
    }

    const preferenceResult = await supabase
        .from("business_category_preference")
        .select("id,category_id")
        .eq("business_id", businessId);

    if (preferenceResult.error) {
        return { ok: false, error: fromSupabaseError(preferenceResult.error) };
    }

    const preferences = preferenceResult.data ?? [];
    const categoryIds = Array.from(new Set(preferences.map((preference) => preference.category_id)));
    const categoriesById = new Map<string, { name: string; path: unknown }>();

    if (categoryIds.length > 0) {
        const categoryResult = await supabase
            .from("category")
            .select("id,name,path")
            .in("id", categoryIds);

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

    const { data, error } = await supabase
        .from("profile")
        .update({ [field]: normalizedValue })
        .eq("id", profileResult.data.id)
        .select("*")
        .single();

    if (error) return { ok: false, error: fromSupabaseError(error) };
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
        .from("home_group_preset")
        .select("id,code,name,description")
        .eq("id", presetId)
        .eq("surface_code", surface)
        .eq("is_active", true)
        .maybeSingle();

    if (presetResult.error) {
        return { ok: false, error: fromSupabaseError(presetResult.error) };
    }

    if (!presetResult.data) {
        return { ok: false, error: fromAppError("validation") };
    }

    const { error } = await supabase
        .from("profile_home_group_preset")
        .upsert(
            {
                profile_id: profileResult.data.id,
                preset_id: presetResult.data.id,
            },
            { onConflict: "profile_id" }
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

    const profile = await getProfileByUserId(userId);
    if (profile?.ok === false) return { ok: false, error: profile.error };

    return {
        ok: true,
        data: mapProfileEmailSetupStatus(profile?.ok === true ? profile.data : null),
    };
}

type UpdateCurrentProfileEmailSetupInput = {
    email: string;
    emailOptIn: boolean;
};

export async function updateCurrentProfileEmailSetup({
    email,
    emailOptIn,
}: UpdateCurrentProfileEmailSetupInput): Promise<
    { ok: true; data: ProfileEmailSetupStatus } | { ok: false; error: AppError }
> {
    const profileResult = await getCurrentAuthenticatedProfile();
    if (!profileResult.ok) return profileResult;

    const normalizedEmail = normalizeProfileEmail(email);
    const payload = {
        email: normalizedEmail.length > 0 ? normalizedEmail : null,
        email_opt_in: emailOptIn,
        email_opt_in_at: emailOptIn ? new Date().toISOString() : null,
    };

    const { data: updatedProfile, error: updateError } = await supabase
        .from("profile")
        .update(payload)
        .eq("id", profileResult.data.id)
        .select("*")
        .single();

    if (updateError) return { ok: false, error: fromSupabaseError(updateError) };

    return {
        ok: true,
        data: mapProfileEmailSetupStatus(updatedProfile as Profile),
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

    const rpcResult: any = await (supabase as any).rpc("send_email_verification_otp", {
        p_profile_id: profileResult.data.id,
        p_email: normalizedEmail,
    });

    if (rpcResult?.error) {
        return { ok: false, error: fromSupabaseError(rpcResult.error) };
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

    const rpcResult: any = await (supabase as any).rpc("verify_email_verification_otp", {
        p_profile_id: profileResult.data.id,
        p_email: normalizedEmail,
        p_code: normalizedToken,
        p_email_opt_in: emailOptIn,
    });

    if (rpcResult?.error) {
        return { ok: false, error: fromSupabaseError(rpcResult.error) };
    }

    return await getCurrentProfileEmailSetupStatus();
}
