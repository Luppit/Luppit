# AGENTS.md

## Scope
Applies to DB table usage, relationships, and SQL transition procedure behavior.

## Current Public Tables (Operational Summary)

### Business & Identity
- `business`: seller business data.
- `profile_business`: profile-business mapping.
- `location`: geographic data.
- `role`: role catalog (e.g. buyer/seller).
- `profile_role`: profile-role mapping.
- `menu_item`: navbar menu catalog (`code`, `label`, `route`, `icon`, `is_active`).
- `role_menu`: role-to-menu mapping with ordering (`sort_order`, `is_active`).

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
  - conditional branch by `template_id + delivery_cat_id`
  - optional `description_append` to extend base template text by delivery type
- `conversation_confirmation_condition_input`:
  - conditional input metadata by `condition_id`
  - supports `input_kind` (currently `otp`)
  - payload contract (`payload_key`, `otp_length`, `is_required`, `sort_order`)
- `conversation_transaction_code`:
  - per-conversation secure OTP/code record (`code_hash`, `code_last4`)
  - ownership and usage tracking (`created_by_profile_id`, `consumed_by_profile_id`, `consumed_at`)

## Conditional Confirmation Resolution
- Confirmation behavior must remain DB-driven:
  - Resolve current delivery type from `conversation.purchase_offer_id -> purchase_offer.delivery_id -> purchase_offer_delivery.delivery_cat_id`.
  - Select condition from `conversation_confirmation_template_condition` by `(template_id, delivery_cat_id)`.
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
  - When action requires conditional inputs (for example OTP), validate against DB configuration and payload keys before transition.
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
