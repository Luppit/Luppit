# AGENTS.md

## Scope
Applies to the buyer request-assistant chat flow under `app/(chat)`.

## Buyer Request Assistant Chat Contract
- Buyer request creation in `/(chat)` is Edge-Function-driven through `POST /functions/v1/ai-completar`.
- Client-side service abstraction may be named around "purchase request assistant", but the deployed Edge Function route is currently `ai-completar`.
- The chat flow must preserve the latest successful `draft_id` and send it on follow-up turns and control actions.
- Explicit UI control actions remain backend contract, not freeform client logic:
  - `SHOW_SUMMARY`
  - `CONTINUE`
  - `PUBLISH`
- The chat currently runs in text-only mode:
  - do not send images from `/(chat)` unless product explicitly re-enables that flow
  - the composer should hide attachment affordances for this surface

## Chat UI Behavior
- Buyer request-assistant messages should render as plain assistant text, not assistant chat bubbles.
- User messages should keep their own bubble styling.
- The only specialized inline component currently allowed in the buyer chat transcript is the publish-summary card shown during review mode.
- The assistant may invite the user to review a summary using plain text; the UI must not require a dedicated "Ver resumen" button to continue that flow.
- When the backend places the chat into `ui_state = 'review'`, the transcript remains the main surface and the inline publish-summary card is appended in the thread.
- If the user types while in review mode, the client may first send `CONTINUE` and then resume normal text messaging; do not keep review mode as a client-only state disconnected from the backend.

## Navigation
- Buyer entry into request creation should route to `/(chat)/chat`.
- Closing the buyer chat from the top bar must be safe when no navigation back-stack exists:
  - prefer `router.back()` only when available
  - otherwise fall back to `/(tabs)`
