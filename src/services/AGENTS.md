# AGENTS.md

## Scope
Applies to services and RPC integration behavior.

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
    - `inputs[]` (conditional dynamic inputs; currently OTP input supported)
    - `cancel_label`, `cancel_icon`
    - `confirm_label`, `confirm_icon`, `confirm_style_code`
    - `description_template` already resolved by DB for active condition (base + append when applicable)

Agents must parse and use this payload directly for rendering and execution decisions.

## Conditional Confirmation Inputs
- Client must render `confirmation.inputs[]` by input kind, not by action code.
- For OTP input entries, use `payload_key` to build action payload dynamically.
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

## RPC Contract: `get_navbar_items_by_profile`
Expected payload includes ordered rows with:
- `menu_code`
- `label`
- `route`
- `icon`
- `sort_order`
- `role_name`

Agents must use this payload directly for navbar rendering decisions.

## Action Execution and Safe Fallbacks
- If an action has no executor, use legacy action execution RPC only as compatibility fallback.
- If an icon key is unknown, omit icon safely.
- If a field value is null, render `-`.
- If confirmation inputs are present, include their values in executor payload using the configured `payload_key`.
- Never block screen render due partial metadata; degrade gracefully.
