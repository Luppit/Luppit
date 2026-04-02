# AGENTS.md

## Scope
Applies to conversation screens and conversation UI behavior.

## Conversation: DB-Driven Contract (Mandatory)
- Actions visible in chat come from `public.get_conversation_view(...)`.
- Which action executes what comes from action executor metadata in DB.
- Whether an action opens confirmation comes from confirmation template metadata in DB.
- Confirmation title/description/rows/buttons/icons must come from DB payload.
- Conditional confirmation additions (description append + inputs like OTP/rating) must come resolved from DB payload for the active conversation context.
- Client can apply only presentational fallback values (for resilience), but must not define product logic.

## Implementation Rules
- Do not map action code to behavior via hardcoded switch if DB already provides `executor`.
- Do not hardcode confirmation copy/layout values when `confirmation` is provided.
- Use template interpolation for `description_template` with `context` keys.
- Render confirmation rows from `confirmation.fields`.
- Render conditional confirmation inputs from `confirmation.inputs`.
- For OTP input kind, collect digits and send executor payload under DB-provided `payload_key`.
- For rating input kind, render the rating component from DB `component_config` and send structured payload (`stars`, `tags`, `comment`) under DB-provided `payload_key`.
- For rating confirmations, popup title should use the rating input label from DB when present, instead of a hardcoded local title.
- Render button labels/icons from confirmation template values.
- Execute server actions via configured executor target (`execution_type='server_rpc'`).
- Respect `requires_refresh` to decide whether to reload conversation view/messages.
- Do not hardcode buyer/seller system-message visibility in client logic; rely on `get_conversation_messages` DB filtering.
- Keyboard behavior in popup confirmations must keep inputs visible (avoid keyboard overlap) while preserving sheet visibility.

## Live Configuration Reference
- Buyer accept offer action is currently configured as:
  - `conversation_action.code = 'BUYER_ACCEPT_OFFER'`
  - executor target: `public.buyer_accept_offer`
  - executor type: `server_rpc`
  - confirmation template: `BUYER_ACCEPT_OFFER_CONFIRMATION`
  - server-side effect: besides conversation transition to `OFFER_ACCEPTED`, it also updates the linked `purchase_request.status` to `offer_accepted`.
