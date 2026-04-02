# AGENTS.md

## Scope
Applies to tab screens, with special focus on home behavior for buyer/seller.

## Seller Home: DB-Driven Contract (Mandatory)
- Seller home request discovery must come from `public.get_seller_home_purchase_requests(p_profile_id uuid)`.
- UI must render section groups from RPC `groups[]` payload (`code`, `name`, `total`, `items[]`) in DB-provided order.
- Group visibility/order/limits are DB configuration (`seller_home_group`, `seller_home_group_preset`, `seller_home_group_preset_item`, `business_seller_home_group_preset`), not client logic.
- Category matching scope is DB-driven via `business_category_preference`; client must not replicate this filter logic.
- Empty seller-home state (SVG + copy) must render when all returned groups have `items.length = 0`.

## Implementation Rules
- Do not hardcode seller-home groups such as `Ver todas`, `Populares`, or `Nuevas` in product logic.
- Do not pass custom limits from client; `max_items` per group is defined in DB.
- Do not use local purchase-request mocks for seller home flows when RPC data exists.
- Keep client behavior presentation-only (horizontal carousels, navigation, loading/empty states).
- Group header action should navigate to a dedicated group listing screen (for example with `groupCode` param).
- Carousel geometry convention for seller home:
  - carousels can be full-bleed within seller-home screen context
  - first card must align with the group header text at initial position
  - after interaction, horizontal scrolling behavior is standard.
