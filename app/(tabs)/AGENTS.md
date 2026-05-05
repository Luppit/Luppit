# AGENTS.md

## Scope
Applies to tab screens, with special focus on home behavior for buyer/seller and the buyer/seller profile tab.

## Buyer/Seller Home: DB-Driven Contract (Mandatory)
- Seller home request discovery must come from `public.get_seller_home_purchase_requests(...)`.
- Buyer home request discovery must come from `public.get_buyer_home_purchase_requests(p_profile_id uuid)`.
- UI must render section groups from RPC `groups[]` payload (`code`, `name`, `total`, `items[]`) in DB-provided order.
- Group visibility/order/limits are DB configuration (`home_group`, `home_group_preset`, `home_group_preset_item`), not client logic.
- Buyer and seller preset assignment is profile-driven via `profile_home_group_preset`; do not use business-level seller preset assignment.
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
- Buyer and seller home request cards may expose long-press menus, but favorite state must be preloaded from the role-specific favorite RPCs and mutations must use add/remove favorite RPC wrappers.
- Buyer home card long-press menu should mirror purchase-request detail options, including favorite toggle copy/icon (`star` vs `star-off`), category info, share, and cancel placeholders unless product requirements change.
- Seller home card long-press menu is intentionally minimal: only add/remove favorite for that seller/request, with `star` when adding and `star-off` when removing.
- Long-press card animations should be subtle press-in lift/scale feedback and must not change card layout, carousel geometry, or normal tap navigation.
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

## Buyer/Seller Profile & Account Settings
- Profile is a focused account surface; hide the shared top navbar on `/profile` and keep the bottom navbar.
- Phone number is the read-only login identity. Show it as account information only; do not add phone edit flows unless auth/login requirements change.
- Buyer profile stats must use real DB-backed data:
  - created requests from buyer-owned `purchase_request` rows
  - offers received from offers attached to those requests
  - buyer rating from `profile_rating_summary`, not recalculated in client code
- Seller profile data must use real DB-backed data:
  - seller profile identity from the current authenticated `profile`
  - business membership from `profile_business`
  - business display data from `business`
  - business rating from `business_rating_summary`, not recalculated in client code
- Seller main profile should show business summary/actions, but must not show a standalone category metric card. Business categories are managed on `/(detail)/business-profile`.
- Seller business information entry points should route to `/(detail)/business-profile`, where category preferences can be viewed and edited.
- Editable buyer/seller profile fields:
  - `name` and `id_document` may update through `profile.service.ts`
  - email must update through the existing OTP verification modal (`/(modal)/email-setup`), not through a plain profile update
- Account settings should keep rows simple and actionable; rows that change data should show a navigation arrow and route to the dedicated edit/verification flow.
- The seller settings cog must route to the same role-aware account settings detail flow as the buyer; detail routes must not depend on tab-only role context being mounted.
- Buyer/seller home preset settings:
  - `Vista de inicio` reads active presets from `home_group_preset` for the current surface (`buyer_home` or `seller_home`)
  - current assignment comes from `profile_home_group_preset`, falling back to active `default` for that surface
  - preview cards must render DB group names/order and `home_group_preset_item.max_items`
  - previewing a preset must not mutate DB; only `Guardar cambios` updates `profile_home_group_preset`
  - do not hardcode preset names, descriptions, group names, order, or limits in the UI.

## Seller Offers Listing
- The seller `Ofertas` tab is a standalone listing surface, not the classic home layout:
  - hide the home top navbar and bottom navbar on this route
  - render the existing back-button + centered-title layout pattern
  - keep title copy as `Todas mis ofertas` unless product copy changes.
- Seller offers data should come from `public.get_current_seller_purchase_offers(...)` once that RPC is available.
- Seller offers search/filter/sort must map to the offers RPC parameters instead of remaining a separate client-only filtering source:
  - text search -> `p_search_text`
  - offer creation date range -> `p_start_date` / `p_end_date`
  - category chips -> `p_category_ids`
  - currency chips -> `p_currency_ids`
  - sort radio -> `p_sort_code`
- Seller offers popup controls must reuse the existing `GlobalPopupHost` visual contract. Do not introduce a custom popup title alignment, missing separator, or alternate sheet spacing for this screen.
- When seller-offers filters or non-default sort are active, show dismissible applied chips matching the home filter chip pattern.
- Price sorting for seller offers must be currency-specific; never sort COL and USD offers together as one numeric list.
- Supported seller-offer price sort codes are:
  - `price_col_low_to_high`
  - `price_col_high_to_low`
  - `price_usd_low_to_high`
  - `price_usd_high_to_low`

## Favorites Tab
- The `Favoritas` tab is a standalone list surface like seller `Ofertas`: hide the shared top navbar, render the back-button + centered-title top bar, and keep the bottom navbar unless product asks otherwise.
- Favorites listing data must come from role-specific RPC wrappers:
  - buyer: `public.get_buyer_purchase_request_favorites(...)`
  - seller: `public.get_seller_purchase_request_favorites(...)`
- Favorites search/filter/sort should map to RPC parameters rather than remaining client-side:
  - text search -> `p_search_text`
  - favorited date range -> `p_start_date` / `p_end_date`
  - category chips -> `p_category_ids`
  - status chips -> `p_status_codes`
  - sort radio -> `p_sort_code`
- Expected favorite item payload includes request card fields plus `favorite_id`, `favorited_at`, and `offers_count`.
- Buyer favorite rows open `/(detail)/purchase-request`; seller favorite rows open `/(conversation)/offer` through `get_or_create_seller_purchase_request_conversation(...)`.
- Favorites popup controls must reuse `GlobalPopupHost` visual behavior and applied chips, matching seller offers.
