# AGENTS.md

## Scope
Applies to DB table usage, relationships, and SQL transition procedure behavior.

## Current Public Tables (Operational Summary)

### Business & Identity
- `business`: seller business data.
- `business_rating_summary`: aggregated business reputation snapshot (`rating`, `num_ratings`).
- `profile_rating_summary`: aggregated profile reputation snapshot (`rating`, `num_ratings`).
- `business_with_rating`: compatibility/read view that exposes business base fields plus rating summary fields.
- `profile_with_rating`: compatibility/read view that exposes profile base fields plus rating summary fields.
- `profile`: authenticated user profile. Email setup is now part of the operational contract:
  - `email`
  - `email_opt_in`
  - `email_opt_in_at`
  - email setup is considered complete only when all three resolve to a non-empty email + `true` opt-in + non-null opt-in timestamp.
- `profile_business`: profile-business mapping.
- `business_category_preference`: business-to-category preference mapping used for seller request discovery.
- `location`: geographic data.
- `role`: role catalog (e.g. buyer/seller).
- `profile_role`: profile-role mapping.
- `menu_item`: navbar menu catalog (`code`, `label`, `route`, `icon`, `is_active`).
- `role_menu`: role-to-menu mapping with ordering (`sort_order`, `is_active`).
- `segment`: top-navbar segment catalog (`name`, `svg_name`, `is_disabled`, `created_at`).

### Top Navbar Segment Configuration
- Buyer/seller top horizontal chips must be sourced from `segment`, not hardcoded UI arrays.
- `segment.is_disabled = true` means segment is visible but non-interactive (greyed out + not clickable).
- Segment icon identity is DB-driven via `segment.svg_name`.
- Icon file location is a fixed app asset convention: `assets/segments/{svg_name}.svg` (bundled app asset path).

### Shared Home Group Configuration
- `home_group`: shared group catalog for home sections, keyed by `surface_code` (currently `seller_home`, `buyer_home`).
- `home_group_preset`: shared preset catalog for home surfaces, keyed by `surface_code`.
- `home_group_preset_item`: enabled groups per preset + `sort_order` + `max_items` (group-level limit).
- `business_home_group_preset`: assigned preset per seller business.
- `profile_home_group_preset`: assigned preset per buyer profile.
- Group limits must come from `home_group_preset_item.max_items`; do not pass limits as procedure parameters.
- Key constraints (must be preserved):
  - `business_category_preference`: unique (`business_id`, `category_id`)
  - `home_group`: unique (`surface_code`, `code`)
  - `home_group_preset`: unique (`surface_code`, `code`)
  - `home_group_preset_item`: unique (`preset_id`, `group_id`)
  - `business_home_group_preset`: unique (`business_id`)
  - `profile_home_group_preset`: unique (`profile_id`)
- `home_group_preset_item.max_items` is required DB config (`not null`, `> 0`) and is the only source of per-group limits.
- Seeded reference codes currently expected:
  - group codes: `all`, `popular`, `newest`, `discarded`
  - preset codes: `default`, `minimalist`
- Default assignment convention:
  - businesses without explicit seller assignment should resolve preset code `default` under `surface_code = 'seller_home'`
  - profiles without explicit buyer assignment should resolve preset code `default` under `surface_code = 'buyer_home'`
- Legacy seller-only home-group tables should not be reintroduced as the runtime source of truth once shared home-group config exists.

### Requests & Offers
- `purchase_request`: buyer request.
- `purchase_request_status`: purchase request lifecycle catalog (`code`, `description`, `is_terminal`).
- `purchase_request_status_ui`: one-row-per-status UI copy for request cards (`status_code`, `ui_text`).
- `purchase_request_visualization`: one row per viewer profile and purchase request used for home/detail visualization counts.
- `purchase_offer`: seller offer for request.
- `purchase_offer_delivery`: delivery terms for offer.
- `purchase_offer_image`: offer images.
- `currency`: currency catalog.
- `delivery_catalog`: delivery method catalog.
- `purchase_request.status` is lifecycle state and must reference `purchase_request_status.code`.
- UI-facing request-card status copy must come from `purchase_request_status_ui.ui_text`, not directly from `purchase_request.status`.
- Current required lifecycle codes:
  - `active`
  - `offer_accepted`
- `purchase_request_visualization` uniqueness must stay one-row-per-profile-per-request:
  - unique (`profile_id`, `purchase_request_id`)
- Buyer grouped home discovery must come from `public.get_buyer_home_purchase_requests(...)`; do not rebuild buyer-home groups from legacy single-request visualization lookup in client code.
- Offer cards in purchase-request detail must include DB-backed business + location + currency metadata from `business_with_rating` (or equivalent DB-backed summary join), together with `purchase_offer.price`.
- `business.rating` and `business.num_ratings` are legacy-removed fields and must not be used as runtime source of truth.

### Ratings
- `conversation_rating`: source-of-truth table for ratings submitted through conversation actions.
- Rating ownership is actor-based and conversation-scoped:
  - buyer rates seller with `BUYER_RATE_SELLER`
  - seller rates buyer with `SELLER_RATE_BUYER`
- Seller ratings may also roll up to `business_rating_summary` through the seller business linked from `purchase_offer.business_id`.
- Aggregated rating values must be read from summary tables/views, not recalculated in client code and not stored as source-of-truth columns on `business`.

## Seller Home Discovery RPC (DB-Driven)
- Runtime source of truth is `public.get_seller_home_purchase_requests(p_profile_id uuid, p_search_text text default null, p_start_date date default null, p_end_date date default null, p_category_ids uuid[] default null, p_seller_interaction_states text[] default null)`.
- Resolution flow:
  - resolve business by `profile_business` using `p_profile_id`
  - resolve category scope by `business_category_preference`
  - resolve active preset by `business_home_group_preset` joined to `home_group_preset` for `surface_code = 'seller_home'` (fallback to active preset code `default` when missing)
  - resolve visible groups/order/limits by `home_group_preset_item` + `home_group` for `surface_code = 'seller_home'`
  - resolve request items from `purchase_request` filtered by configured categories and active lifecycle (`status = 'active'`)
  - when provided, apply seller-home filters in DB:
    - `p_search_text`: case-insensitive match against request title
    - `p_start_date` / `p_end_date`: compare against request recency date (`published_at::date`, fallback `created_at::date`)
    - `p_category_ids`: narrow the existing `business_category_preference` category scope
    - `p_seller_interaction_states`: match seller-specific request state (`new`, `opened`, `discarded`)
  - resolve `seller_interaction_state` from the latest conversation for that seller/request:
    - `new`: no conversation row exists for the seller/request
    - `opened`: a conversation exists and is not `REQUEST_DISCARDED`
    - `discarded`: latest seller/request conversation is `REQUEST_DISCARDED`
  - resolve request-card status label from `purchase_request_status_ui` joined by `purchase_request.status`.
  - resolve `views_count` from `purchase_request_visualization` aggregated by `purchase_request_id`.
- Do not rebuild request-card status text from lifecycle codes in client code.
- The RPC must not require limit parameters; limits are fully DB-driven via preset items.
- Procedure output contract is JSON with `groups[]`; each group includes:
  - `code`
  - `name`
  - `total`
  - `items[]`
- Item payload expected in `items[]`:
  - `id`, `title`, `summary_text`
  - `category_id`, `category_name`, `category_path`
  - `status`, `status_label`, `published_at`, `created_at`
  - `views_count`
  - `seller_interaction_state`
- Sorting behavior by group code (current convention):
  - `all`: by `published_at desc nulls last`, then `created_at desc`
  - `popular`: by `views_count desc`, then recency
  - `newest`: by `created_at desc`
  - `discarded`: by seller discard timestamp desc, then `created_at desc`
- If no business is resolved for the input profile, return `{ "groups": [] }`.
- Unknown group codes should return empty `items[]` unless explicitly implemented with DB-backed rules.
- Seller-home normal groups should exclude requests whose latest seller conversation is `REQUEST_DISCARDED` or `OFFER_REJECTED`.
- Seller-home `discarded` group should include only requests whose latest seller conversation is `REQUEST_DISCARDED`.

## Buyer Home Discovery RPC (DB-Driven)
- Runtime source of truth is `public.get_buyer_home_purchase_requests(p_profile_id uuid, p_search_text text default null, p_start_date date default null, p_end_date date default null, p_status_codes text[] default null)`.
- Resolution flow:
  - resolve active preset by `profile_home_group_preset` joined to `home_group_preset` for `surface_code = 'buyer_home'` (fallback to active preset code `default` when missing)
  - resolve visible groups/order/limits by `home_group_preset_item` + `home_group` for `surface_code = 'buyer_home'`
  - resolve request items from `purchase_request` filtered by the current buyer owner (`purchase_request.profile_id = p_profile_id`) and the buyer-home visible lifecycle set, currently `active` plus `offer_accepted`
  - when provided, apply buyer-home filters in DB:
    - `p_search_text`: case-insensitive match against request title
    - `p_start_date` / `p_end_date`: compare against request recency date (`published_at::date`, fallback `created_at::date`)
    - `p_status_codes`: match against `purchase_request.status`
  - resolve request-card status label from `purchase_request_status_ui` joined by `purchase_request.status`.
  - resolve `views_count` from `purchase_request_visualization` aggregated by `purchase_request_id`.
- Do not rebuild request-card status text from lifecycle codes in client code.
- The RPC must not require limit parameters; limits are fully DB-driven via preset items.
- Procedure output contract is JSON with `groups[]`; each group includes:
  - `code`
  - `name`
  - `total`
  - `items[]`
- Item payload expected in `items[]`:
  - `id`, `title`, `summary_text`
  - `category_id`, `category_name`, `category_path`
  - `status`, `status_label`, `published_at`, `created_at`
  - `views_count`
- Sorting behavior by group code (current convention):
  - `all`: by `published_at desc nulls last`, then `created_at desc`
  - `popular`: by `views_count desc`, then recency
  - `newest`: by `created_at desc`
- If no active preset is resolved, return `{ "groups": [] }`.
- Unknown group codes should return empty `items[]` unless explicitly implemented with DB-backed rules.

### Conversation Core
- `conversation`: buyer-seller conversation linked to offer/request.
- `conversation_status`: conversation state machine states, includes UI timeline icon key (`icon`).
- `conversation_message`: conversation messages (text/image/system), includes `image_path`.
  - System message visibility can be role-targeted via `visible_to_role_id` (FK to `role.id`).
- `conversation_message_kind`: message kind catalog.

### Conversation Actions & Rules
- `conversation_action`: UI actions (`code`, `label`, `icon`, `ui_slot`, `style_code`) plus:
  - `executor_code` (FK to executor config)
  - `confirmation_template_id` (FK to confirmation template)
- `ui_slot_catalog`: shared catalog for conversation UI placements used by both executable `actions[]` and passive `slots[]`.
- `conversation_status_role_rule`: per role + state messaging permissions.
- `conversation_status_role_action`: per role + state enabled actions and order.
- Action placement is DB-driven through `conversation_action.ui_slot` (cataloged in `ui_slot_catalog`).
- Current executable action slots:
  - `TOP`: visible primary actions in the conversation header area
  - `AUX`: auxiliary actions near the composer / lower thread area
  - `MENU`: options shown in the conversation header ellipsis popup
- Current passive informational slot:
  - `STATUS`: in-thread status card rendered from `get_conversation_view(...).slots[]`, currently used for active deadline cards
- If product wants the same behavior available in more than one place, duplicate it as separate `conversation_action` rows/codes mapped to different `ui_slot` values instead of hardcoding dual placement in client code.
- `conversation_status_role_action.status_code` must reference an existing `conversation_status.code` value. Do not assume an action code (for example `SELLER_CONCRETAR`) is also a valid status code.
- Rating actions must be hidden by DB action resolution once the same participant has already submitted the matching `conversation_rating` row for that conversation/action.
- `conversation_transition`: valid state transitions by action + actor role.
- `conversation_status_history`: transition audit.
- `conversation_deadline`: deadline-based transitions.
  - Current model is one active deadline row per conversation, keyed by `conversation.id`.
  - Later lifecycle deadlines overwrite/reset the active row instead of preserving deadline history.
- `deadline_type_catalog`: deadline behavior metadata.
  - `expiration_days` may be null.
  - `due_at_source` defines how `conversation_deadline.due_at` is computed.
  - `active_status_code`, `default_trigger_transition_to`, `buyer_overdue_message`, and `seller_overdue_message` are DB-driven source of truth.
  - Active deadline-card rendering metadata also lives here: `ui_slot`, `slot_eyebrow_label`, `slot_section_label`, `buyer_active_message`, `seller_active_message`.
- Current deadline types:
  - `SELLER_CONCRETAR_EXPIRATION`: `SELLER_ACCEPTED -> DELAYED_ACCEPTANCE`, fixed days from catalog.
  - `SENT_SHIPMENT_EXPIRATION`: `SENT_SHIPMENT -> DELAYED_SHIPMENT`; shipping delivery policies use days from `purchase_offer_delivery.max_days`. Store pickup policies (`purchase_offer_delivery.after_days`) do not create this deadline.
- Seller request bootstrap states in current flow:
  - `REQUEST_OPENED`: seller opened request chat before first offer.
  - `REQUEST_DISCARDED`: seller discarded request chat.
- Current post-offer rejection/edit states in flow:
  - `OFFER_REJECTED`: buyer rejected the seller's offer; request remains `active`.
  - `OFFER_MADE` may be reset back to `REQUEST_OPENED` when the seller cancels the current offer.
- `public.get_or_create_seller_purchase_request_conversation(...)` is also the DB-owned side-effect point for seller request opens; it should insert into `purchase_request_visualization` with `on conflict (profile_id, purchase_request_id) do nothing` before returning/creating the conversation.
- Seller first-offer action in current flow:
  - `conversation_action.code = 'SELLER_CREATE_OFFER'`
  - executor uses `execution_type='client_command'` with target `modal.offer`
  - transition from `REQUEST_OPENED` to `OFFER_MADE` is DB-driven via `conversation_transition`.
- Seller edit-offer action in current flow:
  - seller `Modificar` action in `OFFER_MADE`
  - executor uses `execution_type='client_command'` with target `modal.offer.edit`
  - no transition is applied when opening edit mode; the save RPC updates offer data in-place and leaves the conversation in `OFFER_MADE`.

### Conversation Action Execution
- `conversation_action_execution_type_catalog`: executor type catalog (e.g. `server_rpc`, `client_command`).
- `conversation_action_executor`:
  - `code`
  - `execution_type` (FK to execution type catalog)
  - `target` (RPC or client command identifier)
  - `requires_refresh`

### Conversation Confirmation
- `conversation_confirmation_template`:
  - `code`, `title`, `description_template`
  - `cancel_label`, `cancel_icon`
  - `confirm_label`, `confirm_icon`, `confirm_style_code`
- `conversation_confirmation_field`:
  - `template_id`
  - `label`, `value_source`, `sort_order`
- `conversation_confirmation_template_condition`:
  - conditional branch by `template_id` plus optional selectors:
    - `actor_role_id` (who is pressing the action)
    - `delivery_cat_id` (delivery context)
  - optional `description_append` to extend base template text
- `conversation_confirmation_condition_input`:
  - conditional input metadata by `condition_id`
  - supports `input_kind` (`otp`, `rating`)
  - payload contract (`payload_key`, `otp_length`, `is_required`, `sort_order`)
  - `component_config` (`jsonb`) for richer UI inputs (e.g. rating stars/chips/comments)
- `otp_type_catalog`:
  - OTP purpose catalog. Current codes:
    - `conversation_transaction`
    - `email_verification`
- `otp_code`:
  - generalized OTP store shared by conversation and email-verification flows
  - current key fields:
    - `otp_type_code`
    - `target_profile_id`
    - `conversation_id`
    - `email`
    - `code_hash`
    - `created_by_profile_id`
    - `created_at`
    - `expires_at`
    - `consumed_at`
    - `consumed_by_profile_id`
    - `invalidated_at`
  - plaintext codes are never stored; validation must compare the submitted code against `code_hash`
  - one active OTP per scope is enforced by partial unique indexes, not by hardcoded client assumptions

## Conditional Confirmation Resolution
- Confirmation behavior must remain DB-driven:
  - Resolve current delivery type from `conversation.purchase_offer_id -> purchase_offer.delivery_id -> purchase_offer_delivery.delivery_cat_id`.
  - Resolve actor role from viewer in current conversation (`BUYER`/`SELLER`).
  - Select condition from `conversation_confirmation_template_condition` with priority:
    - role + delivery
    - role-only
    - delivery-only
    - generic (no role, no delivery)
  - Build final confirmation payload with:
    - base template fields
    - appended description when condition provides `description_append`
    - conditional `inputs[]` from `conversation_confirmation_condition_input`.
- `delivery_catalog` labels are presentation data; matching logic should rely on FK IDs, not client-side string comparisons.

## Delivery-Specific OTP and Deadline Rules
- `purchase_offer_delivery.max_days` is the shipping signal. `purchase_offer_delivery.after_days` is the store-pickup signal.
- `public.seller_concretar_request(...)` must preserve the original shipping behavior:
  - always transition to `SELLER_ACCEPTED`
  - always create/reset `SELLER_CONCRETAR_EXPIRATION`
  - never require or generate buyer OTP for shipping-only flows.
- `public.seller_concretar_request(...)` must treat store pickup separately:
  - generate a new 4-digit OTP
  - invalidate any previous active `otp_code` rows for `otp_type_code = 'conversation_transaction'` and the same conversation
  - store only its hash in `otp_code`
  - optionally trigger delivery email only when buyer profile email setup is complete (`email`, `email_opt_in`, `email_opt_in_at`)
  - do not make shipping flows depend on OTP generation or delivery.
- `public.seller_finalize_transaction(...)` must preserve shipping behavior:
  - do not require OTP for shipping
  - create/reset `SENT_SHIPMENT_EXPIRATION` using `purchase_offer_delivery.max_days`
  - do not auto-complete the conversation.
- `public.seller_finalize_transaction(...)` must treat store pickup separately:
  - require OTP / transaction code input
  - validate the submitted 4-digit code against the active `otp_code` row for `otp_type_code = 'conversation_transaction'`
  - reject consumed, invalidated, or expired OTP rows
  - mark the code as consumed
  - do not create `SENT_SHIPMENT_EXPIRATION`
  - auto-call `public.buyer_confirm_received(...)` after successful OTP validation because the buyer is already receiving the product in store.

## OTP Email Delivery Integration
- Pickup OTP email delivery is DB-triggered through a Supabase Edge Function (`/functions/v1/send_otp_delivery`) called from SQL via `pg_net`.
- Email verification OTP delivery is DB-triggered through a Supabase Edge Function (`/functions/v1/send_otp_verification`) called from SQL via `pg_net`.
- `pg_net` + Vault are separate from Edge Function secrets:
  - Postgres-side caller secrets belong in `vault.decrypted_secrets`
  - Edge-function runtime secrets (for example `RESEND_API_KEY`) stay in Edge Function secrets.
- Current DB-to-Edge invocation pattern uses Vault secrets named:
  - `project_url`
  - `anon_key`
- The Edge Function payload contract for pickup OTP delivery is:
  - `email`
  - `otp`
- The Edge Function payload contract for email-verification OTP delivery is:
  - `email`
  - `otp`
- Do not assume `pg_net` calls are synchronous; requests are queued and start after transaction commit.

## Email Verification OTP Flow
- Current DB-driven email verification flow uses:
  - `public.send_email_verification_otp(p_profile_id uuid, p_email text)`
  - `public.verify_email_verification_otp(p_profile_id uuid, p_email text, p_code text, p_email_opt_in boolean default true)`
- `public.send_email_verification_otp(...)` must:
  - normalize the target email
  - generate a new 4-digit OTP
  - invalidate any previous active `otp_code` rows for the same `target_profile_id` + `email` with `otp_type_code = 'email_verification'`
  - insert a fresh `otp_code` row with expiry
  - queue the email through `send_otp_verification`
- `public.verify_email_verification_otp(...)` must:
  - validate the submitted 4-digit OTP against the latest active `otp_code` row for `otp_type_code = 'email_verification'`
  - reject consumed, invalidated, or expired OTP rows
  - mark the OTP row as consumed atomically
  - update `profile.email`, `profile.email_opt_in`, and `profile.email_opt_in_at` in the same transaction instead of requiring a second client-side profile update

## Conversation Menu Resolution
- Conversation ellipsis-menu options are not a separate subsystem; they are normal `conversation_action` rows with `ui_slot = 'MENU'`.
- `public.get_conversation_view(...)` must return `MENU` actions in the same `actions[]` payload alongside `TOP` and `AUX`.
- The client decides placement from `actions[].ui_slot`; it must not synthesize menu options from other tables.
- `conversation_status_role_action.sort_order` remains the ordering source of truth for menu option order.

## Conversation Informational Slots
- Passive status cards are not `conversation_action` rows and must not be modeled as executable actions.
- `public.get_conversation_view(...)` must return passive UI cards in `slots[]` alongside `actions[]`.
- Current implementation may use `public.get_conversation_ui_slots(...)` as a helper, but the app contract is `get_conversation_view(...).slots[]`.
- Active deadline cards must resolve from:
  - current `conversation.status_code`
  - current viewer role
  - unresolved `conversation_deadline`
  - `deadline_type_catalog` rendering metadata
- Deadline slot visibility must remain DB-driven:
  - show only when the conversation has an unresolved active deadline
  - show only when `deadline_type_catalog.active_status_code = conversation.status_code`
  - show only when the resolved role-specific active message is non-empty
- Current deadline cards use `ui_slot = 'STATUS'` and are rendered in-thread as passive items after the existing message list, not in the action areas.

## Transition Procedure Pattern
- Procedures referenced by `conversation_action_executor.target` must encapsulate transition logic in DB.
- Required behavior for transition procedures:
  - Validate `p_conversation_id` + `p_profile_id`.
  - Validate actor belongs to conversation and allowed role.
  - Resolve transition from `conversation_transition` using:
    - current `conversation.status_code`
    - action (`conversation_action.code` / `action_id`)
    - actor role (`actor_role_id`)
  - Update `conversation.status_code` to resolved `to_status_code`.
  - Insert `conversation_status_history` audit row.
  - When action requires conditional inputs (for example OTP or rating), validate against DB configuration and payload keys before transition.
  - For OTP/code flows, compare payload code against stored hash and mark code as consumed atomically.
  - When writing system chat messages, set `conversation_message.visible_to_role_id` to target buyer/seller role-specific visibility when needed.
  - Return a JSON result with at least success + status transition details.
- Current implemented example: `public.buyer_accept_offer`.
- Current rating executor example: `public.submit_conversation_rating`.
- `public.buyer_accept_offer` must also update `purchase_request.status` from `active` to `offer_accepted` atomically with the conversation transition.
- `public.seller_discard_request_conversation(...)` must transition `REQUEST_OPENED -> REQUEST_DISCARDED`, write history, and add the seller discard system message without changing `purchase_request.status`.
- `public.buyer_reject_offer(...)` must transition `OFFER_MADE -> OFFER_REJECTED`, write history, and add the buyer reject system message without changing `purchase_request.status`.
- `public.seller_cancel_offer(...)` must validate seller ownership in `OFFER_MADE`, delete the linked offer artifacts, reset the conversation to `REQUEST_OPENED`, and leave the thread reusable for a new offer.
- `public.submit_conversation_rating(...)` must validate actor membership, validate the structured `rating` payload, write/update `conversation_rating`, refresh rating summaries, and only apply a conversation transition when a matching DB transition exists.
- `public.seller_concretar_request(...)` must transition `OFFER_ACCEPTED -> SELLER_ACCEPTED` and create/reset the active deadline from `deadline_type_catalog.code = 'SELLER_CONCRETAR_EXPIRATION'` for both delivery types.
- `public.seller_concretar_request(...)` must generate+store a secure 4-digit transaction code hash in `otp_code` with `otp_type_code = 'conversation_transaction'` only for store pickup (`purchase_offer_delivery.after_days`), not for shipping (`purchase_offer_delivery.max_days`).
- `public.seller_concretar_request(...)` may trigger pickup OTP delivery email only when the buyer profile has completed email setup (`email`, `email_opt_in`, `email_opt_in_at`).
- `public.seller_finalize_transaction(...)` must not require OTP for shipping deliveries; shipping should transition to `SENT_SHIPMENT` and create/reset `SENT_SHIPMENT_EXPIRATION`.
- `public.seller_finalize_transaction(...)` must require and validate the provided 4-digit OTP against the active `otp_code` row with `otp_type_code = 'conversation_transaction'` only for store pickup, mark it consumed atomically, skip `SENT_SHIPMENT_EXPIRATION`, and finish by calling `public.buyer_confirm_received(...)`.
- Seller request bootstrap/create-offer flow currently uses:
  - `public.get_or_create_seller_purchase_request_conversation(...)`
  - `public.create_seller_offer_from_conversation(...)`
- `public.get_or_create_seller_purchase_request_conversation(...)` must resolve `buyer_profile_id` from `purchase_request.profile_id`, not from any legacy visualization table.
- `public.get_or_create_seller_purchase_request_conversation(...)` should also repair stale existing conversations whose `buyer_profile_id` no longer matches the request owner before returning them.
- `public.create_seller_offer_from_conversation(...)` must atomically:
  - create `purchase_offer_delivery`, `purchase_offer`, `purchase_offer_image`
  - apply conversation transition/history for seller first offer
  - create chat messages in order: one `TEXT` summary first, then `IMAGE` messages.
- For offer-publish chat images, `conversation_message.image_path` must reference files uploaded to the `conversations` storage bucket (same contract as chat image upload), not offer-only storage paths.
- `public.get_seller_offer_edit_payload(...)` should be the DB-backed preload source for seller offer edit mode and may return `files[]` directly when the deployment supports it.
- `public.update_seller_offer_from_conversation(...)` must atomically:
  - validate seller ownership and current `OFFER_MADE` state
  - update `purchase_offer_delivery` and `purchase_offer`
  - keep/delete/create `purchase_offer_image` rows based on kept ids plus new offer image paths
  - append one system message announcing the update
  - append a refreshed `TEXT` offer summary message
  - append `IMAGE` chat messages in the final order provided by `p_conversation_image_paths`
  - keep the conversation in `OFFER_MADE`

## Role-Specific System Messages
- For role-specific system messages, write `conversation_message.visible_to_role_id` using role catalog IDs (not client-side string flags).
- Overdue deadline messages must come from deadline metadata and be written separately for buyer and seller visibility.
- The shared deadline expiry processor must resolve active status, target status, and overdue copy from `deadline_type_catalog`, not from hardcoded status checks.

## Timeline Resolution (DB-Driven)
- Offer timeline on purchase-request detail must be resolved by DB RPC `public.get_conversation_timeline(p_conversation_id uuid)`.
- The RPC must return:
  - completed states (newest first) from `conversation_status_history`
  - next possible non-system state from `conversation_transition` as pending (`is_next = true`)
  - state display metadata from `conversation_status` (`description`, `icon`)
  - legible date string for UI (`reached_at_label`) and optional prefix (`pre_label`, e.g. `A la espera de:`)
- Client must not rebuild the timeline graph with direct table joins when this RPC exists.
