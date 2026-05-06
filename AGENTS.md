# AGENTS.md

## Purpose
This is the entrypoint for agent guidance in this repository.
Keep this file short and use scoped `AGENTS.md` files for domain-specific rules.

## Global Principles
- Prefer the smallest change that fully solves the task.
- Preserve the existing architecture and naming patterns.
- Do not change established app architecture or shared UI behavior without asking permission first.
- Reuse shared UI component behavior exactly; for example, popup sheets must keep the established header, separator, spacing, and applied-chip conventions unless the user explicitly approves a redesign.
- Reuse current services, RPCs, and tables before adding new abstractions.
- Keep UI behavior DB-driven when DB configuration exists.
- Keep buyer/seller ratings DB-driven via normalized rating tables/views; do not reintroduce rating-as-source-of-truth columns on `business`.
- Keep buyer/seller home discovery and grouping DB-driven via shared home-group preset metadata.
- Seller home discovery remains category-driven via `business_category_preference`; buyer home discovery remains profile-owned via `purchase_request.profile_id`.
- Keep buyer/seller home-card status copy DB-driven via purchase-request status metadata; home/group UIs must render RPC `status_label` and must not show raw lifecycle codes.
- Keep buyer-home filtering DB-driven via `public.get_buyer_home_purchase_requests(...)`; do not rebuild buyer-home search/date/status filtering as a separate source of truth in screen components once the RPC supports it.
- Keep seller-home filtering DB-driven via `public.get_seller_home_purchase_requests(...)`; do not rebuild seller-home search/date/category/interaction filtering as a separate source of truth in screen components once the RPC supports it.
- Keep purchase-request favorites DB-driven via `purchase_request_favorite` and buyer/seller favorite RPCs; favorites are role-specific through `role_id`, not text flags or client-only state.
- Keep seller-offers listing search/filter/sort DB-driven via `public.get_current_seller_purchase_offers(...)` once available; do not keep a separate client-side source of truth after the RPC supports the needed parameters.
- Keep purchase-request visualization tracking DB-driven via `purchase_request_visualization` and RPCs; do not make home-card eye counts or seller-open side effects depend on client-only state.
- Do not reintroduce buyer/seller home mock request data/actions when DB RPC is available.
- Keep purchase-request lifecycle and selected-offer behavior DB-driven using status metadata and RPCs.
- Keep seller discard / buyer reject / seller cancel-offer / seller edit-offer flows DB-driven through conversation state, action metadata, and RPCs; do not recreate those flows as client-only state.
- Never hardcode conversation action behavior when DB metadata exists.
- Conversation action placement is DB-driven via `conversation_action.ui_slot` / `ui_slot_catalog`; supported action slots now include `TOP`, `AUX`, and `MENU`.
- Conversation header ellipsis options must be sourced from DB `MENU` actions returned by `get_conversation_view`; do not hardcode menu items in client code.
- Never hardcode double-rating prevention in client code when DB conversation-action resolution already knows whether the participant has rated.
- Keep buyer/seller chat-list discovery DB-driven via `public.get_current_profile_conversations(...)`; do not rebuild chat listing/search/unread ordering from direct client table reads.
- Keep conversation message open/unopened state DB-driven via `conversation_message` buyer/seller open-state columns; only `public.get_conversation_messages(...)` marks visible non-system messages opened for the current viewer side.
- Keep conversation deadlines and overdue transitions DB-driven via `deadline_type_catalog` + `conversation_deadline`; do not hardcode deadline days, overdue copy, or expiry branching in client code.
- Passive conversation status cards are DB-driven via `get_conversation_view(...).slots[]`; current informational slot `STATUS` is used for active deadline cards resolved from deadline metadata, not from `conversation_action`.
- Never hardcode navbar items/routes/labels/icons when DB metadata exists.
- Never hardcode top-navbar segment chips when DB `segment` configuration exists.
- For conversation confirmations with conditional behavior (e.g. by actor role and/or delivery type), resolve conditions in DB and return resolved metadata in `get_conversation_view`; do not branch product logic by action code in client.
- Keep delivery-specific OTP/deadline behavior DB-driven: shipping (`purchase_offer_delivery.max_days` plus `max_value`/`max_unit`) and store pickup (`purchase_offer_delivery.after_days` plus `after_value`/`after_unit`) are different flows and must not share the same OTP/deadline assumptions.
- Keep account email setup and email-consent gating profile-driven via `profile.email`, `profile.email_opt_in`, and `profile.email_opt_in_at`; do not recreate a parallel client-only completion flag.
- Keep buyer/seller profile/account data DB-driven: phone is read-only login identity, editable name/document go through profile service updates, email changes go through OTP verification, buyer rating comes from `profile_rating_summary`, seller business rating comes from `business_rating_summary`, and buyer/seller home preset assignment comes from `profile_home_group_preset`.
- Keep buyer/seller home preset assignment profile-driven via `profile_home_group_preset`; do not use business-level seller preset assignment.
- Keep seller business category preferences DB-driven via `business_category_preference` and `set_current_business_category_preferences`; category editing belongs on the business information detail page, not as a seller main-profile metric card.

## Scoped Guidance Map
- Buyer request-assistant chat behavior: `app/(chat)/AGENTS.md`
- Conversation UI behavior: `app/(conversation)/AGENTS.md`
- Purchase-request detail UI behavior: `app/(detail)/AGENTS.md`
- Home tabs, buyer/seller home behavior, and profile tab behavior: `app/(tabs)/AGENTS.md`
- Navbar UI behavior: `src/components/navbar/AGENTS.md`
- RPC/runtime contracts and execution behavior: `src/services/AGENTS.md`
- Data model and SQL transition/procedure constraints: `src/db/AGENTS.md`

## Testing & Verification
- Run lint on changed files.
- Run relevant TS checks/tests when possible.
- Never claim checks passed unless they were executed.
- If global checks fail due unrelated pre-existing issues, state that explicitly.

## Security
- Never log secrets/tokens/keys.
- Do not expose internal credentials in code, logs, or SQL snippets.
