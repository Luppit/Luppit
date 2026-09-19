# AGENTS.md

## Scope
Applies to DB table usage, schema contracts, SQL RPCs, and transition procedures.

## DB Principles
- DB metadata/RPCs are the source of truth for product behavior when present; do not rebuild equivalent rules in the client.
- Preserve normalized ownership and unique constraints. Avoid adding text flags or duplicate source-of-truth columns for state already modeled by catalog/relationship tables.
- Transition procedures should validate authenticated ownership, resolve role/state/action from DB tables, update state atomically, write history, and return structured JSON.
- Use role/catalog IDs and configured metadata for visibility, labels, styles, deadlines, and actions; avoid string-matching presentation labels.

## Core Sources Of Truth
- Identity/profile: `profile`, `role`, `profile_role`, `profile_business`; phone is login identity, email setup is complete only with non-empty `email`, `email_opt_in=true`, and non-null `email_opt_in_at`.
- Ratings: `conversation_rating`, `business_rating_summary`, `profile_rating_summary`, and compatibility rating views; do not restore runtime `business.rating` source-of-truth columns.
- Navigation and segments: `menu_item`, `role_menu`, `segment`; `segment.svg_name='todas'` means no segment filter.
- Home configuration: `home_group`, `home_group_preset`, `home_group_preset_item`, `profile_home_group_preset`; group limits come from `max_items`, not RPC params.
- Seller discovery scope: `business_category_preference`; buyer request ownership: `purchase_request.profile_id`.
- Request presentation: lifecycle in `purchase_request_status`, status text/style in `purchase_request_status_ui`, visualizations in `purchase_request_visualization`, favorites in role-specific `purchase_request_favorite`.
- Locations: `business.location_id -> location.id`; runtime selectors use active Costa Rica district rows and save only district ids.
- Notifications: `notification`, `notification_type_catalog`, `profile_notification`; active unread means `dismissed_at is null and read_at is null`, while dismissed rows remain retained history.

## Home, Favorites, And Listings
- Buyer home runtime source is `get_buyer_home_purchase_requests`; seller home runtime source is `get_seller_home_purchase_requests`.
- Home RPCs apply search/date/status/category/interaction/segment filters, visible lifecycle flags, grouping/order/limits, status label/style, view counts, and buyer offer counts.
- Seller interaction states are seller/request conversation states: `new`, `opened`, `discarded`.
- Favorite mutations/lists use role-specific RPCs over `purchase_request_favorite` with uniqueness on profile + request + role.
- Seller offers listing uses `get_current_seller_purchase_offers`; sort COL and USD with separate sort codes rather than one mixed price ordering.

## Conversation Model
- `conversation`, `conversation_status`, `conversation_transition`, `conversation_status_history`, and role/action tables define the state machine.
- `conversation_action.ui_slot` drives executable placement (`TOP`, `AUX`, `MENU` today); passive UI cards come from `get_conversation_view(...).slots[]` and currently use `STATUS`.
- Confirmation templates, conditional branches, OTP/rating inputs, labels, icons, and styles are DB-driven and returned already resolved for the active context.
- The read-only offer summary uses `get_conversation_view.context.offer_fulfillment_details` for current published delivery cost/timing, separate from simplified acceptance choice labels. Direct access to fulfillment tables remains denied; pending proposals never replace these details.
- Rating actions should disappear through DB action resolution once the current participant has submitted the matching rating.
- `conversation_message` open-state fields are updated only by `get_conversation_messages`; system messages are excluded from open-state tracking and may be role-targeted through `visible_to_role_id`.
- Chat-list identity comes from `get_current_profile_conversations`: seller sees buyer profile name, buyer sees seller business name; request title remains separate.

## Realtime
- Conversation realtime is private Supabase Broadcast invalidation, not raw table streaming.
- Do not add operational conversation/offer tables to public realtime for chat UI unless the security model is redesigned.
- Broadcast only lightweight hints (`conversation_id`, diagnostic `reason`, and `refresh` targets such as `messages`/`view`); never broadcast message text, action metadata, OTPs, ratings, or role-specific content.

## Delivery, OTP, And Email
- Non-sensitive client-readable runtime variables live in `app_config`; `support_email` is the support contact source of truth. Keep secrets out of this exposed configuration table.
- Delivery source of truth is `purchase_offer_delivery_method` for shipping and `purchase_offer_pickup_method` for pickup. Timing fields are integer days and method rows remain valid when timing is null.
- Store pickup transaction completion uses a 4-digit OTP stored as a hash in `otp_code` with `otp_type_code='conversation_transaction'`; shipping must not depend on pickup OTP logic.
- Email verification uses `send_email_verification_otp` and `verify_email_verification_otp`; verification updates `profile.email`, `email_opt_in`, and `email_opt_in_at` atomically.
- Plaintext OTPs must never be stored.

## Required RPC Ownership
- `get_or_create_seller_purchase_request_conversation` owns seller request open/reuse, buyer-profile alignment, first request summary message creation, and visualization insertion.
- `create_seller_offer_fulfillment_from_conversation` and `update_seller_offer_fulfillment_from_conversation` own offer writes, normalized fulfillment, transition/history updates, and chat summary/image messages.
- Seller AI revisions use `begin_seller_offer_edit`, `get_seller_offer_edit_draft`, `save_seller_offer_edit_draft`, `discard_seller_offer_edit`, and `publish_seller_offer_revision`. An edit draft carries the published offer revision and its own optimistic version; it never changes the agreed offer. Submission creates one immutable pending `offer_change_proposal`; only `resolve_offer_change_proposal` with buyer approval applies the saved terms. Preserve sent drafts and private transcripts.
- Submission atomically snapshots the reviewed draft version and posts one buyer proposal notification. Buyer approval applies normalized UNIT/TOTAL pricing, fulfillment and photos, appends `offer_agreement_revision`, and preserves the accepted conversation stage and operational deadlines. The original confirmation anchors pickup timing; approval invalidates old pickup codes. Acceptance revisions include photos. The original creation draft is the only `mode=create` row per offer; revision history may contain many `mode=edit` rows.
- Offer proposals are allowed in OFFER_MADE, OFFER_ACCEPTED, SELLER_ACCEPTED and DELAYED_ACCEPTANCE. Pending terms never replace the current agreement. Initial approval also accepts the purchase with explicit delivery selection; later approval requires new selection only if the selected method is affected. Rejection/withdrawal preserve the agreement. Cancellation retains proposal history; fulfillment closes pending proposals.
- `get_conversation_timeline` owns purchase-request detail timeline order, pending state, icons, and legible date labels.

## Transition Procedure Pattern
- Validate `p_conversation_id` and `p_profile_id` against the authenticated user.
- Resolve actor role, current status, action, transition, permissions, conditional inputs, and deadline behavior from DB metadata.
- Apply status/request/offer/deadline changes atomically, write `conversation_status_history`, and create role-visible system messages when needed.
- For OTP/rating inputs, validate payload keys against DB configuration and consume/update records atomically.
- Return JSON with success and transition/result details; do not rely on client-side heuristics to finish the workflow.
