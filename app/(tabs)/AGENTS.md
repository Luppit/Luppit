# AGENTS.md

## Scope
Applies to tab screens, buyer/seller home behavior, profile tab, and standalone list tabs.

## Buyer/Seller Home
- Seller home uses `public.get_seller_home_purchase_requests(...)`; buyer home uses `public.get_buyer_home_purchase_requests(...)`.
- Render `groups[]` in DB order. Group visibility, order, names, totals, and limits are DB configuration, not client logic.
- Filters and selected top-navbar segment must reload the same home RPCs; `todas` means no segment filter.
- Cards render RPC `status_label`, `status_style_code`, `views_count`, and buyer `offers_count`; do not recompute or enrich those values in screens.
- Buyer cards open `/(detail)/purchase-request`; seller cards open `/(conversation)/offer` through `get_or_create_seller_purchase_request_conversation(...)`.
- Seller open side effects, including visualization tracking, belong to the seller-open RPC.
- Favorites are role-specific and must preload/mutate through buyer/seller favorite RPC wrappers.
- Email setup gates buyer/seller home: if incomplete, do not call home RPCs; show the account-setup state and route the CTA to `/(modal)/email-setup`.
- Keep home behavior presentation-only: loading/empty states, carousels, navigation, long-press menus, and shared card styling.

## Profile And Account
- Profile/settings-style rows and cards should follow the soft grouped-list style in `src/components/AGENTS.md`.
- Hide the shared top navbar on `/profile`; keep the bottom navbar.
- Phone is read-only login identity. Editable profile fields are `name` and `id_document`; email changes use the OTP verification modal.
- Profile switcher uses the authenticated database profile list and the shared popup system. Active profile shows the shared `Activo` status chip.
- Switching profiles keeps the same auth session, changes the root active-profile context by profile ID, and remounts profile-scoped tab state.
- Profile subtitles and unread counts come from `get_current_user_profiles()`; do not cache cross-account profile snapshots.
- Notifications route to `/(detail)/notifications`; unread badge comes from `notification.service.ts`, refreshes on profile focus, and must not block screen render.
- Buyer/seller profile stats and ratings are DB-backed through services/summary tables. Seller business category/location editing belongs on `/(detail)/business-profile`, not main profile metric cards.
- Home preset settings read active DB presets for the current surface, preview metadata non-destructively, and save only on `Guardar cambios`.

## Standalone List Tabs
- Seller `Ofertas`, `Favoritas`, and `Chats` are standalone list surfaces: hide the home top navbar, use the shared top-attached glass header, and follow existing popup/applied-chip patterns.
- Seller offers data should come from `public.get_current_seller_purchase_offers(...)`; filters/sort map to RPC params, and price sorting must be currency-specific.
- Favorites data comes from role-specific favorite RPCs. Buyer favorites open purchase-request detail; seller favorites open the seller conversation through the seller-open RPC.
- Chats data comes from `public.get_current_profile_conversations(...)`; search/date/category filters map to RPC params and status filtering should not be added unless the RPC changes.
- Chat row `display_name` is counterpart identity; conversation route/header uses `request_title`.
- Unopened chats render before opened chats, then by `last_message_at desc`; use theme colors and the standalone-list visual pattern.
