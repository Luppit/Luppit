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
- `purchase_request_visualization`: seller views on request.
- `purchase_offer`: seller offer for request.
- `purchase_offer_delivery`: delivery terms for offer.
- `purchase_offer_image`: offer images.
- `currency`: currency catalog.
- `delivery_catalog`: delivery method catalog.
- Buyer home request resolution must use `purchase_request_visualization.profile_id -> purchase_request_visualization.purchase_request_id -> purchase_request.id` (do not assume `purchase_request.profile_id` matches `public.profile.id` in every environment).
- Offer cards in purchase-request detail must include DB-backed business + location + currency metadata (`business.name`, `business.rating`, `business.num_ratings`, `location.province`, `currency.currency_code`) together with `purchase_offer.price`.

### Conversation Core
- `conversation`: buyer-seller conversation linked to offer/request.
- `conversation_status`: conversation state machine states.
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
  - When writing system chat messages, set `conversation_message.visible_to_role_id` to target buyer/seller role-specific visibility when needed.
  - Return a JSON result with at least success + status transition details.
- Current implemented example: `public.buyer_accept_offer`.

## Role-Specific System Messages
- For role-specific system messages, write `conversation_message.visible_to_role_id` using role catalog IDs (not client-side string flags).
