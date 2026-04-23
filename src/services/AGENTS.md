# AGENTS.md

## Scope
Applies to services and RPC integration behavior.

## RPC Contract: `get_conversation_view`
Expected payload includes:
- `conversation`
- `role_code`
- `permissions`
- `context`
- `slots[]`, each slot may include:
  - `code`
  - `kind`
  - `ui_slot`
  - `sort_order`
  - `eyebrow_label`
  - `title`
  - `icon`
  - `section_label`
  - `message`
  - `due_at`
  - optional preformatted values such as `formatted_due_at`
- `actions[]`, each action may include:
  - `executor` object (or null)
  - `confirmation` object (or null), including:
    - `fields[]`
    - `inputs[]` (conditional dynamic inputs; currently supports `otp` and `rating`)
    - `cancel_label`, `cancel_icon`
    - `confirm_label`, `confirm_icon`, `confirm_style_code`
    - `description_template` already resolved by DB for active condition (base + append when applicable)
    - for each input: `component_config` (optional JSON config for rich input renderers)

Agents must parse and use this payload directly for rendering and execution decisions.
- `permissions.can_send_messages`, `actions[]`, and `slots[]` are independent DB signals; client behavior must support them coexisting.
- `actions[].ui_slot` is a DB-driven placement signal. Current conversation slots are:
  - `TOP`: prominent action buttons near the header
  - `AUX`: lower in-thread/composer-adjacent actions
  - `MENU`: header ellipsis popup options
- `slots[].ui_slot` is a DB-driven placement signal for passive content. Current passive conversation slot:
  - `STATUS`: deadline/status card rendered inside the thread
- Services and screens must not assume only `TOP`/`AUX` exist.
- Menu-option presses must execute through the same confirmation/executor path as any other conversation action.
- Rating actions such as `BUYER_RATE_SELLER` and `SELLER_RATE_BUYER` may be omitted by the RPC once the current participant already rated; the client must respect the returned `actions[]` list and must not try to re-add them locally.
- Deadline/status cards must come from `slots[]`, not from local status/action-code conditionals.
- `STATUS` slots are rendered after the current message list so they behave like the latest passive system item in the thread.

## Conditional Confirmation Inputs
- Client must render `confirmation.inputs[]` by input kind, not by action code.
- For OTP input entries, use `payload_key` to build action payload dynamically.
- For rating input entries, submit structured payload under `payload_key` (e.g. stars/tags/comment) and use `component_config` to drive UI.
- Client-side validation is presentational only (required/length checks); source of truth is DB executor validation.

## RPC Contract: `get_conversation_messages`
Current function contract:
- `public.get_conversation_messages(p_conversation_id uuid)`
- Returns `setof public.conversation_message` ordered by `created_at asc`.

System visibility rules in RPC:
- Non-system messages are returned normally for conversation participants.
- System messages with `visible_to_role_id is null` are visible to both sides.
- System messages with `visible_to_role_id` are visible only when it matches the current viewer side role in the conversation.
- Viewer role resolution is DB-driven using authenticated profile + conversation participant side + `profile_role -> role`.

## RPC Contract: `get_conversation_timeline`
Current function contract:
- `public.get_conversation_timeline(p_conversation_id uuid)`
- Returns ordered rows for timeline rendering:
  - `sort_order`
  - `status_code`
  - `label`
  - `icon`
  - `reached_at`
  - `reached_at_label` (already legible for UI, e.g. `7 de Julio, 2025. Hora 5:00pm`)
  - `is_next`
  - `is_completed`
  - `pre_label` (e.g. `A la espera de:` for pending row)

Service behavior:
- Timeline rendering in purchase-request detail must call this RPC.
- Do not reconstruct timeline by querying `conversation_status_history` + `conversation_transition` directly in UI services when this RPC is available.
- Delayed states such as `DELAYED_ACCEPTANCE` and `DELAYED_SHIPMENT` are expected to arrive from the RPC and must be rendered without local state-order assumptions.

## RPC Contract: `get_navbar_items_by_profile`
Expected payload includes ordered rows with:
- `menu_code`
- `label`
- `route`
- `icon`
- `sort_order`
- `role_name`

Agents must use this payload directly for navbar rendering decisions.

## Profile Email Setup Service Contract
- `profile.email`, `profile.email_opt_in`, and `profile.email_opt_in_at` are the source of truth for whether the user finished email setup.
- Current service contract in `profile.service.ts`:
  - `getCurrentProfileEmailSetupStatus()` returns:
    - `email`
    - `emailOptIn`
    - `emailOptInAt`
    - `isComplete`
  - `requestCurrentProfileEmailSetupVerification(...)` sends a 4-digit verification OTP through DB RPC `public.send_email_verification_otp(p_profile_id uuid, p_email text)`.
  - `resendCurrentProfileEmailSetupVerification(...)` reuses the same DB RPC and invalidates any previous active verification OTP for the same profile/email.
  - `verifyCurrentProfileEmailSetup(...)` verifies through DB RPC `public.verify_email_verification_otp(p_profile_id uuid, p_email text, p_code text, p_email_opt_in boolean)` and must not do a second client-side profile update after success.
  - `updateCurrentProfileEmailSetup(...)` remains a direct authenticated-profile update helper, but email-setup completion flow should prefer the send/verify RPC path over a plain profile write.
- Email setup is complete only when:
  - email is non-empty
  - `email_opt_in = true`
  - `email_opt_in_at is not null`
- Do not create a separate client-only setup flag for this flow.
- The email-setup modal UI may keep local step/input state, but sending/verifying the OTP and final profile completion are DB-driven operations.

## Table Contract: `segment`
Current query contract:
- Read from `public.segment` with fields:
  - `name`
  - `svg_name`
  - `is_disabled`
  - `created_at`
- Order is DB-driven (currently `created_at asc` in service behavior).

Service behavior:
- Top-navbar segment chips for buyer/seller home must come from this table (no hardcoded list).
- `is_disabled=true` must be propagated to UI so chips render disabled (greyed out + non-pressable).
- `svg_name` maps to bundled app asset `assets/segments/{svg_name}.svg`.

## RPC Contract: `get_seller_home_purchase_requests`
Current function contract:
- `public.get_seller_home_purchase_requests(p_profile_id uuid)`
- Returns JSON object with `groups[]`.

Expected payload for each group entry:
- `code`
- `name`
- `total`
- `items[]` (purchase request cards for that group)

Expected item fields in `items[]`:
- `id`
- `title`
- `summary_text`
- `category_id`
- `category_name`
- `category_path`
- `status`
- `status_label`
- `published_at`
- `created_at`
- `views_count`

Service behavior:
- Seller home must call this RPC for request discovery/grouping.
- Seller home cards must render `status_label` when present and treat `status` as the raw lifecycle code.
- Seller home cards must render the RPC-provided `views_count` directly; do not fetch or recalculate visualization totals separately in the screen layer.
- Do not send per-group limits from client; limits are DB configuration in `home_group_preset_item.max_items`.
- Do not hardcode group visibility/order in services.
- Do not build seller-home request groups from local mocks when this RPC is available.
- Seller preset resolution must read from shared home-group config for `surface_code = 'seller_home'`, with assignment via `business_home_group_preset`.

## RPC Contract: `get_buyer_home_purchase_requests`
Current function contract:
- `public.get_buyer_home_purchase_requests(p_profile_id uuid, p_search_text text default null, p_start_date date default null, p_end_date date default null, p_status_codes text[] default null)`
- Returns JSON object with `groups[]`.

Expected payload for each group entry:
- `code`
- `name`
- `total`
- `items[]` (purchase request cards for that group)

Expected item fields in `items[]`:
- `id`
- `title`
- `summary_text`
- `category_id`
- `category_name`
- `category_path`
- `status`
- `status_label`
- `published_at`
- `created_at`
- `views_count`

Service behavior:
- Buyer home must call this RPC for request discovery/grouping.
- Buyer preset resolution must read from shared home-group config for `surface_code = 'buyer_home'`, with assignment via `profile_home_group_preset`.
- Buyer home currently includes the DB-visible lifecycle set for owned requests, which includes both `active` and `offer_accepted`.
- Buyer-home filters map to RPC params:
  - request-name text -> `p_search_text`
  - date range -> `p_start_date` / `p_end_date`
  - selected status chips -> `p_status_codes`
- Buyer home cards must render `status_label` when present and treat `status` as the raw lifecycle code for downstream logic.
- Buyer home cards and buyer group listings must render the RPC-provided `views_count` directly; a missing/zero eye count should be investigated in the RPC payload before changing UI code.
- Buyer grouped home/group screens may enrich items with purchase-offer counts client-side for `ProductCard` footer text, but grouping/order/visibility must still come from the RPC payload.
- Do not hardcode group visibility/order in services.
- Do not build buyer-home request groups from local mocks when this RPC is available.
- During rollout, client services may keep a compatibility fallback for older deployments that still expose the legacy single-argument buyer-home RPC signature, but that fallback must preserve the RPC payload shape and remain temporary.

## Buyer/Seller Home Email Gate
- Buyer and seller home screens must resolve current email setup status before loading home groups.
- If email setup is incomplete:
  - do not call buyer/seller home group RPCs
  - render the account-setup-required state instead.
- The CTA from that blocked state should route to the dedicated email setup modal rather than implementing inline editing inside home.

## RPC Contract: `get_or_create_seller_purchase_request_conversation`
Current function contract:
- `public.get_or_create_seller_purchase_request_conversation(p_purchase_request_id uuid, p_profile_id uuid)`

Service behavior:
- Seller home request open flow must call this RPC (not direct table insert/select in client services).
- RPC is source of truth to reuse existing seller/request conversation or bootstrap one when missing.
- Buyer ownership for the bootstrapped conversation must come from `purchase_request.profile_id`.
- Seller-open visualization tracking is also owned by this RPC: it should insert a `purchase_request_visualization` row for (`p_profile_id`, `p_purchase_request_id`) with conflict-safe idempotency (`do nothing` on the one-row-per-profile/request unique constraint).
- If an existing seller/request conversation is reused, the RPC should self-heal `conversation.buyer_profile_id` so it matches `purchase_request.profile_id` before returning it.

## RPC Contract: `create_seller_offer_from_conversation`
Current function contract:
- `public.create_seller_offer_from_conversation(...)`
- Required inputs include seller/profile context, offer payload, and two image arrays:
  - offer image paths for `purchase_offer_image`
  - conversation image paths for `conversation_message.image_path`

Service behavior:
- Offer publish from seller conversation should use this RPC for DB writes/transition, not multiple direct table writes from client.
- RPC must create conversation chat messages in this order:
  - one `TEXT` message with offer summary
  - then `IMAGE` messages for uploaded images (in original upload order).

## RPC Contract: `get_seller_offer_edit_payload`
Current function contract:
- `public.get_seller_offer_edit_payload(p_conversation_id uuid, p_profile_id uuid)`

Expected payload includes:
- `purchase_request_id`
- `purchase_offer_id`
- `description`
- `price`
- `currency_id`
- `primary_delivery_catalog_id`
- `pickup_after_days`
- `shipping_price`
- `shipping_max_days`
- `files[]` (optional; when empty, client may backfill from `purchase_offer_image`)

Service behavior:
- Seller offer edit mode should prefer this RPC for preload data.
- Compatibility fallback may read `conversation`, `purchase_offer`, `purchase_offer_delivery`, and `purchase_offer_image` directly when the RPC is missing or incomplete.
- Preloaded files may carry extra client metadata such as existing image `id`, `storagePath`, and `isExisting` so the update flow can keep/delete images without losing identity.

## RPC Contract: `update_seller_offer_from_conversation`
Current function contract:
- `public.update_seller_offer_from_conversation(...)`
- Required inputs include seller/profile context, updated offer payload, kept offer-image ids, new offer image paths, and the final ordered conversation image paths to re-post in chat.

Service behavior:
- Offer edit save must use this RPC for DB writes, system message creation, and refreshed offer-summary chat messages.
- Client should send:
  - kept `purchase_offer_image.id` values for existing images that remain attached to the offer
  - new `offers` bucket paths only for newly added images
  - final ordered `conversations` bucket paths for the images that should be re-posted into chat after the update
- Current edit-save flow uploads only new images to the `offers` bucket, but uploads the full current file list to the `conversations` bucket so the update RPC can append the refreshed image messages in order.
- Offer upload helpers must normalize MIME types before calling Supabase Storage; do not pass malformed picker MIME strings through unchanged.

## Action Execution and Safe Fallbacks
- If an action has no executor, use legacy action execution RPC only as compatibility fallback.
- If an icon key is unknown, omit icon safely.
- For popup menu options, apply the same `style_code` color semantics used elsewhere (`primary`, `error`, etc.); do not fall back to plain dark text for `primary` actions.
- If a field value is null, render `-`.
- If confirmation inputs are present, include their values in executor payload using the configured `payload_key`.
- Never block screen render due partial metadata; degrade gracefully.
- Do not add client-side deadline countdown or overdue transition logic; messages, permissions, actions, and transitions must keep coming from DB-backed RPC data.

## Purchase Offer Data Contract
- Buyer offer-card data must read seller reputation from the DB-backed rating view/summary relation (`business_with_rating`), not from removed `business.rating` or `business.num_ratings` columns.
- When querying `purchase_offer`, keep the existing shape for UI consumers (`business_name`, `business_rating`, `business_num_ratings`, `business_province`, `offer_currency_code`) even if the underlying relation changes from `business` to `business_with_rating`.
- Editable offer drafts and update payloads may reuse the same file model as `FilePicker`, extended with optional metadata for persisted images (`id`, `storagePath`, `isExisting`).
