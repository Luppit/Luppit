# AGENTS.md

## Purpose
This document is the source of truth for agents working in this repository.
For conversation features, UI behavior must be driven by database configuration and RPC payloads, not hardcoded client logic.

## Core Principles
- Prefer the smallest change that fully solves the task.
- Preserve the existing architecture and naming patterns.
- Reuse current services/RPCs/tables before adding new abstractions.
- Never hardcode conversation action behavior if it exists in DB configuration.

## Conversation: DB-Driven Contract (Mandatory)
- Actions visible in chat come from `public.get_conversation_view(...)`.
- Which action executes what comes from action executor metadata in DB.
- Whether an action opens confirmation comes from confirmation template metadata in DB.
- Confirmation title/description/rows/buttons/icons must come from DB payload.
- Client can apply only presentational fallback values (for resilience), but must not define product logic.

## Current Public Tables (Operational Summary)

### Business & Identity
- `business`: seller business data.
- `profile_business`: profile-business mapping.
- `location`: geographic data.

### Requests & Offers
- `purchase_request`: buyer request.
- `purchase_request_visualization`: seller views on request.
- `purchase_offer`: seller offer for request.
- `purchase_offer_delivery`: delivery terms for offer.
- `purchase_offer_image`: offer images.
- `currency`: currency catalog.
- `delivery_catalog`: delivery method catalog.

### Conversation Core
- `conversation`: buyer-seller conversation linked to offer/request.
- `conversation_status`: conversation state machine states.
- `conversation_message`: conversation messages (text/image/system), includes `image_path`.
- `conversation_message_kind`: message kind catalog.

### Conversation Actions & Rules
- `conversation_action`: UI actions (`code`, `label`, `icon`, `ui_slot`, `style_code`) plus:
  - `executor_code` (FK to executor config)
  - `confirmation_template_id` (FK to confirmation template)
- `conversation_status_role_rule`: per role + state messaging permissions.
- `conversation_status_role_action`: per role + state enabled actions and order.
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

## RPC Contract: `get_conversation_view`
Expected payload includes:
- `conversation`
- `role_code`
- `permissions`
- `context`
- `actions[]`, each action may include:
  - `executor` object (or null)
  - `confirmation` object (or null), including:
    - `fields[]`
    - `cancel_label`, `cancel_icon`
    - `confirm_label`, `confirm_icon`, `confirm_style_code`

Agents must parse and use this payload directly for rendering and execution decisions.

## Live Conversation Configuration
- Buyer accept offer action currently configured as:
  - `conversation_action.code = 'BUYER_ACCEPT_OFFER'`
  - executor target: `public.buyer_accept_offer`
  - executor type: `server_rpc`
  - confirmation template: `BUYER_ACCEPT_OFFER_CONFIRMATION`
- Typical confirmation field sources:
  - `offer_name`
  - `offer_price`
  - `offer_description`
  - `business_name`

## Implementation Rules (Conversation)
- Do not map action code to behavior via hardcoded switch if DB already provides `executor`.
- Do not hardcode confirmation copy/layout values when `confirmation` is provided.
- Use template interpolation for `description_template` with `context` keys.
- Render confirmation rows from `confirmation.fields`.
- Render button labels/icons from confirmation template values.
- Execute server actions via configured executor target (`execution_type='server_rpc'`).
- Respect `requires_refresh` to decide whether to reload conversation view/messages.

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
  - Return a JSON result with at least success + status transition details.
- Current implemented example: `public.buyer_accept_offer`.

## Safe Fallback Rules
- If an action has no executor, use legacy action execution RPC only as compatibility fallback.
- If an icon key is unknown, omit icon safely.
- If a field value is null, render `-`.
- Never block screen render due partial metadata; degrade gracefully.

## Testing & Verification
- Run lint on changed files.
- Run relevant TS checks/tests when possible.
- Never claim checks passed unless executed.
- If global checks fail due unrelated pre-existing issues, state that explicitly.

## Security
- Never log secrets/tokens/keys.
- Do not expose internal credentials in code, logs, or SQL snippets.
