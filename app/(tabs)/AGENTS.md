# AGENTS.md

## Scope
Applies to tab screens, with special focus on home behavior for buyer/seller.

## Buyer/Seller Home: DB-Driven Contract (Mandatory)
- Seller home request discovery must come from `public.get_seller_home_purchase_requests(p_profile_id uuid)`.
- Buyer home request discovery must come from `public.get_buyer_home_purchase_requests(p_profile_id uuid)`.
- UI must render section groups from RPC `groups[]` payload (`code`, `name`, `total`, `items[]`) in DB-provided order.
- Group visibility/order/limits are DB configuration (`home_group`, `home_group_preset`, `home_group_preset_item`), not client logic.
- Seller preset assignment is DB-driven via `business_home_group_preset`; buyer preset assignment is DB-driven via `profile_home_group_preset`.
- Seller category matching scope is DB-driven via `business_category_preference`; client must not replicate this filter logic.
- Buyer home request scope is DB-driven by the buyer RPC and currently resolves from `purchase_request.profile_id = p_profile_id` plus the DB-visible lifecycle set, which currently includes `active` and `offer_accepted`.
- Empty home state must render when all returned groups have `items.length = 0`.

## Implementation Rules
- Do not hardcode buyer/seller home groups such as `Ver todas`, `Populares`, or `Nuevas` in product logic.
- Do not pass custom limits from client; `max_items` per group is defined in DB.
- Do not use local purchase-request mocks for buyer/seller home flows when RPC data exists.
- Keep client behavior presentation-only (horizontal carousels, navigation, loading/empty states).
- Group header action should navigate to a dedicated group listing screen (for example with `groupCode` param) for both buyer and seller.
- Buyer home and seller home may share the same grouped section layout, but buyer request cards must keep the buyer visual contract (`ProductCard` with status chip + footer offers label) instead of reusing the seller compact card.
- Buyer grouped request cards and buyer group listing items must open `/(detail)/purchase-request`.
- Seller request card press (home + group listing) must not navigate to purchase-request detail for seller role.
- Seller request card press must open `/(conversation)/offer` and resolve conversation via DB RPC `public.get_or_create_seller_purchase_request_conversation(...)`.
- Buyer grouped home/group screens may enrich RPC items with offer counts client-side for `ProductCard` footer text, but must not replace RPC-driven grouping/order/visibility logic.
- Carousel geometry convention for seller home:
  - carousels can be full-bleed within seller-home screen context
  - first card must align with the group header text at initial position
  - after interaction, horizontal scrolling behavior is standard.
