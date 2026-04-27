# AGENTS.md

## Scope
Applies to tab screens, with special focus on home behavior for buyer/seller.

## Buyer/Seller Home: DB-Driven Contract (Mandatory)
- Seller home request discovery must come from `public.get_seller_home_purchase_requests(...)`.
- Buyer home request discovery must come from `public.get_buyer_home_purchase_requests(p_profile_id uuid)`.
- UI must render section groups from RPC `groups[]` payload (`code`, `name`, `total`, `items[]`) in DB-provided order.
- Group visibility/order/limits are DB configuration (`home_group`, `home_group_preset`, `home_group_preset_item`), not client logic.
- Seller preset assignment is DB-driven via `business_home_group_preset`; buyer preset assignment is DB-driven via `profile_home_group_preset`.
- Seller category matching scope is DB-driven via `business_category_preference`; client must not replicate this filter logic.
- Seller home filters (request-name text, date range, category selection, seller interaction state) must drive the same seller RPC, not a separate local grouping source.
- Buyer home request scope is DB-driven by the buyer RPC and currently resolves from `purchase_request.profile_id = p_profile_id` plus the DB-visible lifecycle set, which currently includes `active` and `offer_accepted`.
- Buyer home filters (request-name text, date range, status selection) must drive the same buyer RPC, not a separate local grouping source.
- Home-card status chip text is DB-driven by RPC item field `status_label`; `status` remains the raw lifecycle code and must not be shown directly in the card UI.
- Home-card eye count is DB-driven by RPC item field `views_count`; do not recompute visualization totals in home/group screens when the RPC already provides them.
- Empty home state must render when all returned groups have `items.length = 0`.
- Buyer empty-state behavior depends on filter state:
  - with no active filters, show the default creation CTA
  - with active filters, show a no-results message and hide the creation CTA
- Seller empty-state behavior depends on filter state:
  - with no active filters, show the default no-opportunities message
  - with active filters, show a no-results message
- Buyer and seller home screens must gate on email setup before loading groups:
  - resolve profile email setup through `profile.service.ts`
  - if incomplete, do not call home-group RPCs
  - render the blocked account-setup state instead.

## Implementation Rules
- Do not hardcode buyer/seller home groups such as `Ver todas`, `Populares`, or `Nuevas` in product logic.
- Do not pass custom limits from client; `max_items` per group is defined in DB.
- Do not use local purchase-request mocks for buyer/seller home flows when RPC data exists.
- Keep client behavior presentation-only (horizontal carousels, navigation, loading/empty states).
- Group header action should navigate to a dedicated group listing screen (for example with `groupCode` param) for both buyer and seller.
- Buyer home and seller home may share the same grouped section layout, but buyer request cards must keep the buyer visual contract (`ProductCard` with status chip + footer offers label) instead of reusing the seller compact card.
- Buyer and seller request cards must prefer `item.status_label` for the status pill and only fall back safely when the label is absent.
- Buyer grouped request cards and buyer group listing items must open `/(detail)/purchase-request`.
- Seller request card press (home + group listing) must not navigate to purchase-request detail for seller role.
- Seller request card press must open `/(conversation)/offer` and resolve conversation via DB RPC `public.get_or_create_seller_purchase_request_conversation(...)`.
- Seller request-card open side effects, including one-row-per-profile visualization tracking, belong in `public.get_or_create_seller_purchase_request_conversation(...)`; do not rely on a separate client insert as the source of truth.
- Buyer grouped home/group screens may enrich RPC items with offer counts client-side for `ProductCard` footer text, but must not replace RPC-driven grouping/order/visibility logic.
- Buyer home must react to the shared top-navbar filter state so applying or clearing filters from the navbar popup reloads the grouped cards in place.
- Seller home must react to the shared top-navbar filter state so applying or clearing filters from the navbar popup reloads the grouped cards in place.
- Seller home group listing screens intentionally reload unfiltered group contents by `groupCode`; do not inherit active top-navbar seller filters there unless product requirements explicitly change.
- Carousel geometry convention for seller home:
  - carousels can be full-bleed within seller-home screen context
  - first card must align with the group header text at initial position
  - after interaction, horizontal scrolling behavior is standard.
- The blocked email-setup state belongs to the home screen layer, but the source of truth does not:
  - completion logic comes from profile email fields / profile service
  - the CTA should open the dedicated email setup modal (`/(modal)/email-setup`)
  - do not duplicate email form state inside the home screen itself.
