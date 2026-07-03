# AGENTS.md

## Scope
Applies to service modules and RPC integration behavior.

## Service Principles
- Services resolve the current authenticated profile internally before reading or mutating profile-owned data; screens should not pass arbitrary profile ids.
- Prefer existing RPC wrappers and service helpers over direct table reads/writes.
- Keep compatibility fallbacks narrow, temporary, and shape-compatible with the RPC payload.
- Treat null/missing metadata as a presentation fallback case; do not block rendering or invent product logic locally.
- Unknown icon keys may be omitted safely.

## Conversation Services
- `get_conversation_view` is the source for permissions, context, executable `actions[]`, passive `slots[]`, confirmations, and conditional inputs.
- Action placement comes from `actions[].ui_slot`; support `TOP`, `AUX`, and `MENU` without assuming this list is exhaustive.
- Passive status/deadline cards come from `slots[]`, currently `ui_slot='STATUS'`, and are not executable actions.
- Render/execute confirmation inputs by input kind and DB-provided `payload_key` (`otp`, `rating`, etc.); client validation is presentational only.
- Rating actions may be omitted by the RPC after the participant has rated; never re-add or suppress them locally.
- Menu actions execute through the same confirmation/executor path as other actions.
- `get_conversation_messages` is the only read path that marks visible non-system messages opened for the viewer side.
- Realtime is private Broadcast invalidation only. On `conversation_changed`, reload messages and/or view through the RPC wrappers; never stream raw conversation rows into chat state.
- Debounced realtime handlers must merge refresh targets so a message-only event does not erase an earlier required view refresh.
- Chat list data comes from `get_current_profile_conversations`; `display_name` is the counterpart identity, while conversation headers use `request_title`.

## Home, Favorites, And Listings
- Buyer home uses `get_buyer_home_purchase_requests`; seller home uses `get_seller_home_purchase_requests`.
- Home RPC params own search/date/status/category/interaction/segment filtering. `todas`, empty, or missing segment means no segment narrowing.
- Home cards render RPC `status_label`, `status_style_code`, `views_count`, and buyer `offers_count`; do not recalculate them in screens.
- Group order, visibility, and limits come from home-group preset metadata; do not pass per-group limits from client code.
- Buyer/seller favorites use role-specific favorite RPCs and `purchase_request_favorite`; filtering/sorting maps to RPC params.
- Seller offers listing should use `get_current_seller_purchase_offers` when available; price sorting must be currency-specific, not one mixed numeric list.
- Seller request open flow uses `get_or_create_seller_purchase_request_conversation`; this RPC owns conversation creation/reuse and visualization side effects.

## Profile, Account, And Notifications
- Notification helpers live in `notification.service.ts`; unread state is `profile_notification.read_at`, and marking read goes through the DB RPC.
- Saved profile snapshots live in `saved.profile.service.ts` and store only non-sensitive display/login payload plus last-known unread counts.
- Switching to a saved non-active profile reuses the existing phone OTP login flow; do not create a parallel auth flow.
- Profile email setup uses `profile.email`, `email_opt_in`, and `email_opt_in_at`; send/verify through email OTP RPCs and avoid a second client-side profile update after verification.
- Buyer/seller profile overview data belongs in `profile.service.ts`: ratings from summary tables/views, seller membership from `profile_business`, location from `business.location_id -> location`, and presets from `profile_home_group_preset`.
- Business category and location edits go through `set_current_business_category_preferences` and `set_current_business_location`; UI should keep unsaved local selection until save.
- Active business locations come from `location` rows with `country_code='CR'` and `is_active=true`; save only the selected district `location.id`.

## Offer And Timeline Services
- Offer create/edit/save flows use conversation-backed RPCs (`create_seller_offer_from_conversation`, `get_seller_offer_edit_payload_v2`/legacy fallback, `update_seller_offer_from_conversation`) rather than scattered direct writes.
- Preserve delivery timing value + unit (`hours`/`days`); legacy day fields are compatibility fallback only.
- Offer upload helpers must normalize MIME types before Supabase Storage calls.
- Buyer offer cards read seller reputation from DB-backed rating views/summaries, not legacy `business.rating` fields.
- Purchase-request timelines come from `get_conversation_timeline`; do not reconstruct timeline order from direct joins when the RPC exists.

## Other Service Contracts
- Navbar items come from `get_navbar_items_by_profile`; render DB `label`, `route`, `icon`, and `sort_order`.
- Top-navbar segments come from `segment`; `svg_name` maps to `assets/segments/{svg_name}.svg`, and `todas` means all segments.
- Buyer request assistant calls `POST /functions/v1/ai-completar`, preserves `draft_id`, and sends explicit control actions (`SHOW_SUMMARY`, `CONTINUE`, `PUBLISH`). This surface is text-only unless product re-enables images.
