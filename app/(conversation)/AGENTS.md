# AGENTS.md

## Scope
Applies to conversation screens and conversation UI behavior.

## Conversation Contract
- Visible chat actions come from `public.get_conversation_view(...).actions[]`; passive deadline/status cards come from `slots[]`.
- DB `ui_slot` determines grouping: `TOP` and `AUX` actions render in the current-state card; `MENU` stays in the overflow menu. Other placements remain available to configured confirmations. Preserve returned ordering; paired-menu projection belongs to the DB, never deduplicate by label/behavior in the client.
- Confirmation title, description, fields, buttons, icons, conditional inputs, and rating/OTP metadata come from the DB payload.
- Action visibility, including double-rating prevention, is DB-resolved. Refresh and trust returned `actions[]` after execution.
- `permissions.can_send_messages=true` shows the composer independently of available actions. DB presentation `locked=true` disables the entire interaction surface while a proposal awaits a buyer decision. Do not repeat card actions in the footer or menu.
- Current-state copy, terms visibility, request brief and proposal comparison come from `context.conversation_presentation`. Passive `slots[]` supply deadlines in that same card above dated history; never append current snapshots after messages or give them historical timestamps.

## Implementation Rules
- Do not hardcode product behavior by action code when an executor/confirmation exists.
- Execute server actions through configured executor targets; `MENU` actions use the same path as `TOP`/`AUX`.
- Current client commands: `modal.offer` opens offer creation with `purchaseRequestId` + `conversationId`; `modal.offer.edit` opens the private AI revision assistant using `conversationId` as source of truth. Leaving preserves the draft; discarding does not cancel the offer. A new offer revision invalidates an open buyer acceptance confirmation. Proposal review uses DB-provided current/proposed terms, labelled photos and explicit choice inputs when delivery is affected; proposal replacement or lifecycle change invalidates an open review. Keep shared popup buttons horizontal.
- Render conditional confirmation inputs by kind and submit under DB-provided `payload_key`; rating popups should prefer the rating input label from DB.
- Use DB-provided slot/card copy and preformatted due dates when available; apply only safe presentational fallbacks.
- Do not mark messages opened in client code; loading messages must go through `public.get_conversation_messages(...)`.
- Header title should be the purchase request title, not counterpart display name.
- The header, terms control, current-state card and dated history follow the approved purchase-stage mockups. The terms control stays below the header; the current-state card floats below it, initially expanded with its existing content and bottom actions. Its compact version prefers the first primary/positive DB action by existing style metadata, falling back to the first non-destructive action or passive title; never promote a destructive action. Preserve expanded action order. The compact version keeps the existing pause/deadline copy and a separate expansion control without an action-count badge; remaining actions are available on expansion. Keep one keyboard owner and the in-flow composer. There is no `Acciones` bubble. Stage 2 uses the amount-free published-offer control; later stages may show the canonical amount when DB presentation permits it.
- Collapse on the first touch outside the card, history scrolling, composer focus or the manual chevron. Card/summary actions receive the first tap; do not collapse during a popup or pending execution. Screen reader exploration uses the manual control, and reduced motion disables the transition. Reserve only the measured compact height so expanding/collapsing never moves the reader's offset. Message/view refreshes never reopen the card. The new-message cue remains separate; there is no `Estado actual` navigation button because the card stays accessible.
- At large font scales, keep the full compact pause/deadline text in a bounded scroll region. While the keyboard is open, temporarily hide the terms bubble/version to keep the card and composer reachable; explicit expansion dismisses the keyboard without clearing the draft and restores those controls. Do not shorten or replace the server's content.
- Preserve the reader's scroll position when messages arrive; show a new-message cue while reading older history. Initial opening keeps the current-state card visible. History expansion is presentational only and does not modify read-state semantics.
- Offer details exist only with a linked offer and permitted DB presentation. Use the shared `GlobalPopupHost` summary config and existing image strip. Load canonical published terms and current offer photos, never private drafts or proposal terms. Invalidate open summaries on offer revision, selection, profile, conversation, lifecycle or visibility changes. Read-only proposal comparisons reuse the same confirmation renderer with `read_only=true` and one close action. Do not change the shared popup shell or its horizontal footer.
- Message bubble labels should use real buyer profile name or seller business name, with generic role labels only as last-resort fallback.
- Shared composer sizing lives in `src/components/inputChat/AGENTS.md`; do not rebuild autosize behavior here.
- Offer create/edit mode uses the normalized shipping/pickup method payloads; timing fields are integer days.

## Realtime
- Conversation realtime uses private Broadcast topic `conversation:<conversation_id>` and event `conversation_changed`.
- Broadcast payloads are invalidation hints only; never consume raw message text, action metadata, confirmation payloads, or role-specific content from realtime.
- Reload messages and/or view through existing RPC wrappers based on the `refresh` targets.
- Merge refresh targets across a debounce window so a later message-only event does not cancel an earlier required view refresh.
- Realtime does not replace local action execution. Actions still execute through DB-provided executor/confirmation metadata, then refresh according to `requires_refresh`.
