# AGENTS.md

## Scope
Applies to conversation screens and conversation UI behavior.

## Conversation: DB-Driven Contract (Mandatory)
- Actions visible in chat come from `public.get_conversation_view(...)`.
- Which action executes what comes from action executor metadata in DB.
- Whether an action opens confirmation comes from confirmation template metadata in DB.
- Confirmation title/description/rows/buttons/icons must come from DB payload.
- Client can apply only presentational fallback values (for resilience), but must not define product logic.

## Implementation Rules
- Do not map action code to behavior via hardcoded switch if DB already provides `executor`.
- Do not hardcode confirmation copy/layout values when `confirmation` is provided.
- Use template interpolation for `description_template` with `context` keys.
- Render confirmation rows from `confirmation.fields`.
- Render button labels/icons from confirmation template values.
- Execute server actions via configured executor target (`execution_type='server_rpc'`).
- Respect `requires_refresh` to decide whether to reload conversation view/messages.
- Do not hardcode buyer/seller system-message visibility in client logic; rely on `get_conversation_messages` DB filtering.

## Live Configuration Reference
- Buyer accept offer action is currently configured as:
  - `conversation_action.code = 'BUYER_ACCEPT_OFFER'`
  - executor target: `public.buyer_accept_offer`
  - executor type: `server_rpc`
  - confirmation template: `BUYER_ACCEPT_OFFER_CONFIRMATION`
