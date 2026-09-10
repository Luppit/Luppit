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
  - `RESTORE`
  - `DISCARD`
- Buyer chat accepts text, images, or both through the existing multipart `ai-completar` contract (up to 3 images, 2 MiB each; JPEG, PNG, WebP or GIF).
- Send image-only turns with an empty prompt; do not invent text that labels their intended use. The backend decides which images describe the requested product and persist with the draft; visual references may remain transient.
- Keep selected images in the user bubble and retain the same images and request identity on failure/retry. Restored transcripts must use persisted `metadata.image_refs` with fresh signed URLs; local picker URIs and signed URLs are not durable storage identities.
- Shared composer internals, including multiline autosize, live in `src/components/inputChat/AGENTS.md`; this surface should configure the shared component rather than forking composer behavior.

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

## Draft Session Lifecycle
- Restore the latest active request draft on entry, including its server ID, ordered transcript, readiness, pending action and review state. Keep composition disabled until restore succeeds; failures expose retry, never a client-only empty fallback.
- Resolve persisted message image references to fresh signed URLs; transient reference images cannot be restored.
- Use the seller-style leave confirmation: Salir retains the draft; Descartar waits for server soft discard. Published requests cannot be discarded as drafts.
- Abort and remount chat state at active-profile changes, and ignore late replies after leaving.
