# AGENTS.md

## Scope
Applies to conversation screens and conversation UI behavior.

## Conversation: DB-Driven Contract (Mandatory)
- Actions visible in chat come from `public.get_conversation_view(...)`.
- Passive deadline/status cards also come from `public.get_conversation_view(...)` through `slots[]`; current card placement uses `ui_slot='STATUS'`.
- Conversation header ellipsis menu options also come from `public.get_conversation_view(...)` through actions with `ui_slot='MENU'`.
- Which action executes what comes from action executor metadata in DB.
- Whether an action opens confirmation comes from confirmation template metadata in DB.
- Confirmation title/description/rows/buttons/icons must come from DB payload.
- Conditional confirmation additions (description append + inputs like OTP/rating) must come resolved from DB payload for the active conversation context.
- Rating actions must disappear when the current participant already submitted the matching conversation rating; this visibility rule is DB-resolved in `get_conversation_view(...)`.
- Client can apply only presentational fallback values (for resilience), but must not define product logic.
- The same product action may intentionally exist in more than one UI slot (for example `TOP` and `MENU`) via distinct DB action rows/codes; client must render whatever DB returns and must not deduplicate by label or behavior.
- Passive slots are not actions; client must not try to execute, confirm, or deduplicate them as if they were buttons.

## Implementation Rules
- Do not map action code to behavior via hardcoded switch if DB already provides `executor`.
- Do not hardcode confirmation copy/layout values when `confirmation` is provided.
- Do not hardcode conversation header menu items; render the ellipsis only when one or more `MENU` actions are returned.
- Do not derive deadline/status cards from `conversation.status_code`, action codes, or local timers when `slots[]` is provided by DB.
- Use template interpolation for `description_template` with `context` keys.
- Render confirmation rows from `confirmation.fields`.
- Render conditional confirmation inputs from `confirmation.inputs`.
- For OTP input kind, collect digits and send executor payload under DB-provided `payload_key`.
- For rating input kind, render the rating component from DB `component_config` and send structured payload (`stars`, `tags`, `comment`) under DB-provided `payload_key`.
- For rating confirmations, popup title should use the rating input label from DB when present, instead of a hardcoded local title.
- Render button labels/icons from confirmation template values.
- Execute server actions via configured executor target (`execution_type='server_rpc'`).
- For `execution_type='client_command'`, resolve behavior by `executor.target`.
- Current required client command: `executor.target='modal.offer'` must open `/(modal)/offer` with `purchaseRequestId` + `conversationId`.
- `MENU` action presses must reuse the same action execution path as `TOP`/`AUX` actions, including confirmations and executor handling.
- Respect `requires_refresh` to decide whether to reload conversation view/messages.
- Do not locally suppress or persist rating-action visibility; after execution, refresh and trust the DB-returned `actions[]`.
- Do not hardcode buyer/seller system-message visibility in client logic; rely on `get_conversation_messages` DB filtering.
- Keyboard behavior in popup confirmations must keep inputs visible (avoid keyboard overlap) while preserving sheet visibility.
- Chat screen should open anchored at the newest message (bottom) on initial load/refresh.
- `STATUS` slots belong inside the scrollable message thread and should render after the existing messages, like the latest passive system item.
- `permissions.can_send_messages=true` must show the composer even when AUX actions exist.
- AUX actions and the composer are not mutually exclusive; when both are present, render AUX actions in a fixed bottom area above the composer, not inside the scrollable message history.
- When `permissions.can_send_messages=false`, AUX actions may continue using the in-thread placement behavior.
- `MENU` actions belong to the header ellipsis popup, not the in-thread action bar or composer area.
- Menu-option styling is still DB-driven by `style_code`; `primary` should render with the usual primary color and `error` with the error color.
- Deadline-card copy, labels, and due date should prefer DB-provided slot values; client may apply only safe presentational fallback formatting when a preformatted date is absent.

## Live Configuration Reference
- Buyer accept offer action is currently configured as:
  - `conversation_action.code = 'BUYER_ACCEPT_OFFER'`
  - executor target: `public.buyer_accept_offer`
  - executor type: `server_rpc`
  - confirmation template: `BUYER_ACCEPT_OFFER_CONFIRMATION`
  - server-side effect: besides conversation transition to `OFFER_ACCEPTED`, it also updates the linked `purchase_request.status` to `offer_accepted`.
- Seller-request bootstrap continues to resolve the buyer side from `purchase_request.profile_id`; conversation setup must not depend on legacy visualization ownership.
- Conversation rating actions are currently configured so the DB may return them only when the current actor has not rated yet:
  - `BUYER_RATE_SELLER`
  - `SELLER_RATE_BUYER`
  - executor target: `public.submit_conversation_rating`
- Current delayed conversation flows:
  - `SELLER_CONCRETAR` transitions `OFFER_ACCEPTED -> SELLER_ACCEPTED`, then the active deadline may expire to `DELAYED_ACCEPTANCE`.
  - `seller_finalize_transaction(...)` transitions to `SENT_SHIPMENT`, then the active deadline may expire to `DELAYED_SHIPMENT` using `purchase_offer_delivery.max_days`.
- Those active deadlines may also surface a passive `STATUS` slot card in `get_conversation_view(...).slots[]` while the deadline is unresolved and the conversation remains in the configured active status.
- `DELAYED_ACCEPTANCE` may have messaging permissions enabled and may also expose AUX or TOP actions from DB metadata.
- `OFFER_MADE` may expose duplicated actions in both `TOP` and `MENU` slots when DB configuration wants both entry points.
  - The client must not suppress the composer just because an AUX action exists.
