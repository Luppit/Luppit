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
    - `inputs[]` (conditional dynamic inputs; currently supports `otp` and `rating`)
    - `cancel_label`, `cancel_icon`
    - `confirm_label`, `confirm_icon`, `confirm_style_code`
    - `description_template` already resolved by DB for active condition (base + append when applicable)
    - for each input: `component_config` (optional JSON config for rich input renderers)

Agents must parse and use this payload directly for rendering and execution decisions.
- `permissions.can_send_messages` and `actions[]` are independent DB signals; client behavior must support both being present at the same time.

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
- `published_at`
- `created_at`
- `views_count`

Service behavior:
- Seller home must call this RPC for request discovery/grouping.
- Do not send per-group limits from client; limits are DB configuration in `seller_home_group_preset_item.max_items`.
- Do not hardcode group visibility/order in services.
- Do not build seller-home request groups from local mocks when this RPC is available.

## RPC Contract: `get_or_create_seller_purchase_request_conversation`
Current function contract:
- `public.get_or_create_seller_purchase_request_conversation(p_purchase_request_id uuid, p_profile_id uuid)`

Service behavior:
- Seller home request open flow must call this RPC (not direct table insert/select in client services).
- RPC is source of truth to reuse existing seller/request conversation or bootstrap one when missing.

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

## Action Execution and Safe Fallbacks
- If an action has no executor, use legacy action execution RPC only as compatibility fallback.
- If an icon key is unknown, omit icon safely.
- If a field value is null, render `-`.
- If confirmation inputs are present, include their values in executor payload using the configured `payload_key`.
- Never block screen render due partial metadata; degrade gracefully.
- Do not add client-side deadline countdown or overdue transition logic; messages, permissions, actions, and transitions must keep coming from DB-backed RPC data.
