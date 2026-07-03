# AGENTS.md

## Scope
Applies to conversation screens and conversation UI behavior.

## Conversation Contract
- Visible chat actions come from `public.get_conversation_view(...).actions[]`; passive deadline/status cards come from `slots[]`.
- Render placement from DB `ui_slot`: `TOP`, `AUX`, `MENU`, and passive `STATUS` today. Do not deduplicate actions by label/behavior; DB may intentionally expose similar actions in multiple slots.
- Confirmation title, description, fields, buttons, icons, conditional inputs, and rating/OTP metadata come from the DB payload.
- Action visibility, including double-rating prevention, is DB-resolved. Refresh and trust returned `actions[]` after execution.
- `permissions.can_send_messages=true` shows the composer even when AUX actions exist. AUX actions and composer can coexist in the fixed bottom area.
- `STATUS` slots render inside the scrollable message thread after messages, like passive system items; they are not executable actions.

## Implementation Rules
- Do not hardcode product behavior by action code when an executor/confirmation exists.
- Execute server actions through configured executor targets; `MENU` actions use the same path as `TOP`/`AUX`.
- Current client commands: `modal.offer` opens offer creation with `purchaseRequestId` + `conversationId`; `modal.offer.edit` opens edit mode using `conversationId` as source of truth.
- Render conditional confirmation inputs by kind and submit under DB-provided `payload_key`; rating popups should prefer the rating input label from DB.
- Use DB-provided slot/card copy and preformatted due dates when available; apply only safe presentational fallbacks.
- Do not mark messages opened in client code; loading messages must go through `public.get_conversation_messages(...)`.
- Header title should be the purchase request title, not counterpart display name.
- Message bubble labels should use real buyer profile name or seller business name, with generic role labels only as last-resort fallback.
- Shared composer sizing lives in `src/components/inputChat/AGENTS.md`; do not rebuild autosize behavior here.
- Offer create/edit mode must preserve delivery timing units (`hours`/`days`) instead of rounding to days.

## Realtime
- Conversation realtime uses private Broadcast topic `conversation:<conversation_id>` and event `conversation_changed`.
- Broadcast payloads are invalidation hints only; never consume raw message text, action metadata, confirmation payloads, or role-specific content from realtime.
- Reload messages and/or view through existing RPC wrappers based on the `refresh` targets.
- Merge refresh targets across a debounce window so a later message-only event does not cancel an earlier required view refresh.
- Realtime does not replace local action execution. Actions still execute through DB-provided executor/confirmation metadata, then refresh according to `requires_refresh`.
