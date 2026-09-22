# AGENTS.md

## Scope
Applies to conversation screens and conversation UI behavior.

## Conversation Contract
- Visible chat actions come from `public.get_conversation_view(...).actions[]`; passive deadline/status cards come from `slots[]`.
- DB `ui_slot` determines grouping: `TOP` and `AUX` actions share the header `Acciones` bubble; `MENU` stays in the overflow menu and passive `STATUS` stays in the transcript. Preserve returned ordering and do not deduplicate actions by label/behavior.
- Confirmation title, description, fields, buttons, icons, conditional inputs, and rating/OTP metadata come from the DB payload.
- Action visibility, including double-rating prevention, is DB-resolved. Refresh and trust returned `actions[]` after execution.
- `permissions.can_send_messages=true` shows the composer independently of available actions. Do not repeat AUX actions below the messages or above the composer.
- `STATUS` slots render inside the scrollable message thread after messages, like passive system items; they are not executable actions.

## Implementation Rules
- Do not hardcode product behavior by action code when an executor/confirmation exists.
- Execute server actions through configured executor targets; `MENU` actions use the same path as `TOP`/`AUX`.
- Current client commands: `modal.offer` opens offer creation with `purchaseRequestId` + `conversationId`; `modal.offer.edit` opens the private AI revision assistant using `conversationId` as source of truth. Leaving preserves the draft; discarding does not cancel the offer. A new offer revision invalidates an open buyer acceptance confirmation. Proposal review uses DB-provided current/proposed terms, labelled photos and explicit choice inputs when delivery is affected; proposal replacement or lifecycle change invalidates an open review. Keep shared popup buttons horizontal.
- Render conditional confirmation inputs by kind and submit under DB-provided `payload_key`; rating popups should prefer the rating input label from DB.
- Use DB-provided slot/card copy and preformatted due dates when available; apply only safe presentational fallbacks.
- Do not mark messages opened in client code; loading messages must go through `public.get_conversation_messages(...)`.
- Header title should be the purchase request title, not counterpart display name.
- Conversation chrome keeps two separate controls below the title: published product total with `Resumen`, and `Acciones` for DB `TOP`/`AUX` actions. Preserve DB ordering and the existing action executor; `MENU` placement remains separate. Keep the title header in layout flow. Render the context controls in a transparent overlay above the transcript and reserve their measured height as the transcript's initial top inset.
- `Resumen` exists only with a linked offer and uses the shared `GlobalPopupHost` summary config and existing trailing image strip. Load canonical published terms and current offer photos, never private drafts or proposal terms. Invalidate open summaries on offer revision, selection, profile, conversation, or lifecycle changes. Do not change the shared popup shell or its horizontal footer for this screen.
- Message bubble labels should use real buyer profile name or seller business name, with generic role labels only as last-resort fallback.
- Shared composer sizing lives in `src/components/inputChat/AGENTS.md`; do not rebuild autosize behavior here.
- Offer create/edit mode uses the normalized shipping/pickup method payloads; timing fields are integer days.

## Realtime
- Conversation realtime uses private Broadcast topic `conversation:<conversation_id>` and event `conversation_changed`.
- Broadcast payloads are invalidation hints only; never consume raw message text, action metadata, confirmation payloads, or role-specific content from realtime.
- Reload messages and/or view through existing RPC wrappers based on the `refresh` targets.
- Merge refresh targets across a debounce window so a later message-only event does not cancel an earlier required view refresh.
- Realtime does not replace local action execution. Actions still execute through DB-provided executor/confirmation metadata, then refresh according to `requires_refresh`.
