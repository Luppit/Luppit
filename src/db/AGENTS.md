# AGENTS.md

## Scope
Applies to DB table usage, relationships, and SQL transition procedure behavior.

## Current Public Tables (Operational Summary)

### Business & Identity
- `business`: seller business data.
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

### Seller Home Group Configuration
- `seller_home_group`: group catalog for seller home sections (for example `all`, `popular`, `newest`).
- `seller_home_group_preset`: preset catalog (for example `default`, `minimalist`).
- `seller_home_group_preset_item`: enabled groups per preset + `sort_order` + `max_items` (group-level limit).
- `business_seller_home_group_preset`: assigned preset per business.
- Group limits must come from `seller_home_group_preset_item.max_items`; do not pass limits as procedure parameters.
- Key constraints (must be preserved):
  - `business_category_preference`: unique (`business_id`, `category_id`)
  - `seller_home_group_preset_item`: unique (`preset_id`, `group_code`)
  - `business_seller_home_group_preset`: unique (`business_id`)
- `seller_home_group_preset_item.max_items` is required DB config (`not null`, `> 0`) and is the only source of per-group limits.
- Seeded reference codes currently expected:
  - group codes: `all`, `popular`, `newest`
  - preset codes: `default`, `minimalist`
- Default assignment convention: businesses without explicit assignment should be linked to preset code `default`.

### Requests & Offers
- `purchase_request`: buyer request.
- `purchase_request_status`: purchase request lifecycle catalog (`code`, `description`, `is_terminal`).
- `purchase_request_visualization`: seller views on request.
- `purchase_offer`: seller offer for request.
- `purchase_offer_delivery`: delivery terms for offer.
- `purchase_offer_image`: offer images.
- `currency`: currency catalog.
- `delivery_catalog`: delivery method catalog.
- `purchase_request.status` is lifecycle state and must reference `purchase_request_status.code`.
- Current required lifecycle codes:
  - `active`
  - `offer_accepted`
- Buyer home request resolution must use `purchase_request_visualization.profile_id -> purchase_request_visualization.purchase_request_id -> purchase_request.id` (do not assume `purchase_request.profile_id` matches `public.profile.id` in every environment).
- Offer cards in purchase-request detail must include DB-backed business + location + currency metadata (`business.name`, `business.rating`, `business.num_ratings`, `location.province`, `currency.currency_code`) together with `purchase_offer.price`.

## Seller Home Discovery RPC (DB-Driven)
- Runtime source of truth is `public.get_seller_home_purchase_requests(p_profile_id uuid)`.
- Resolution flow:
  - resolve business by `profile_business` using `p_profile_id`
  - resolve category scope by `business_category_preference`
  - resolve active preset by `business_seller_home_group_preset` (fallback to active preset code `default` when missing)
  - resolve visible groups/order/limits by `seller_home_group_preset_item` + `seller_home_group`
  - resolve request items from `purchase_request` filtered by configured categories and active lifecycle (`status = 'active'`).
- Popularity must be computed from `purchase_request_visualization` count per `purchase_request_id` (returned as `views_count` in items).
- The RPC must not require limit parameters; limits are fully DB-driven via preset items.
- Procedure output contract is JSON with `groups[]`; each group includes:
  - `code`
  - `name`
  - `total`
  - `items[]`
- Item payload expected in `items[]`:
  - `id`, `title`, `summary_text`
  - `category_id`, `category_name`, `category_path`
  - `status`, `published_at`, `created_at`
  - `views_count`
- Sorting behavior by group code (current convention):
  - `all`: by `published_at desc nulls last`, then `created_at desc`
  - `popular`: by views (`purchase_request_visualization` count) desc, then recency
  - `newest`: by `created_at desc`
- If no business is resolved for the input profile, return `{ "groups": [] }`.
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
- `conversation_status_role_rule`: per role + state messaging permissions.
- `conversation_status_role_action`: per role + state enabled actions and order.
- `conversation_status_role_action.status_code` must reference an existing `conversation_status.code` value. Do not assume an action code (for example `SELLER_CONCRETAR`) is also a valid status code.
- `conversation_transition`: valid state transitions by action + actor role.
- `conversation_status_history`: transition audit.
- `conversation_deadline`: deadline-based transitions.

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
- `conversation_transaction_code`:
  - per-conversation secure OTP/code record (`code_hash`, `code_last4`)
  - ownership and usage tracking (`created_by_profile_id`, `consumed_by_profile_id`, `consumed_at`)

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
- `public.buyer_accept_offer` must also update `purchase_request.status` from `active` to `offer_accepted` atomically with the conversation transition.

## Role-Specific System Messages
- For role-specific system messages, write `conversation_message.visible_to_role_id` using role catalog IDs (not client-side string flags).

## Timeline Resolution (DB-Driven)
- Offer timeline on purchase-request detail must be resolved by DB RPC `public.get_conversation_timeline(p_conversation_id uuid)`.
- The RPC must return:
  - completed states (newest first) from `conversation_status_history`
  - next possible non-system state from `conversation_transition` as pending (`is_next = true`)
  - state display metadata from `conversation_status` (`description`, `icon`)
  - legible date string for UI (`reached_at_label`) and optional prefix (`pre_label`, e.g. `A la espera de:`)
- Client must not rebuild the timeline graph with direct table joins when this RPC exists.
