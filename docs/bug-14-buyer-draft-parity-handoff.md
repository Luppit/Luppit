# Bug 14: buyer request draft resume and discard

Status: draft identity fixes implemented and tested; resume/discard parity awaits approval of the public contract and database changes below. This patch does **not** yet make saved buyer drafts resumable or discardable.

## Scope and checkout evidence

- App worktree: `/Users/josedanielcr/.codex/worktrees/28f0/Luppit`, based on `15f7acfbaf33c725d87df989be35646b6b764c81`.
- Database source inspected read-only: `/Users/josedanielcr/Development/luppit-supabase`, `f16a3cda5aedfc38e0aa2810b19c857ddf3a8e35`.
- Edge source inspected read-only: `/Users/josedanielcr/Development/ai-edge-functions`, `8161db6089aa79ffc333963b6e6106c435ec7597`. The deployable buyer source is `supabase/functions/ai-completar/`; the older root copy differs.
- Hosted LuppitDB inspection was limited to function definitions, grants, policies, constraints, and menu configuration. No actual draft/message content or credentials were read.
- No merges, commits, pushes, release builds, backend edits, or deployments. The saved main checkouts remain unchanged.

## Implemented independently of new contracts

`app/(chat)/chat-session.context.tsx` now retains the latest successful non-null draft ID, forwards a newly returned ID to undispatched requests in a CONTINUE -> correction sequence, and stops that sequence when the server reports publication. Retry saves the exact dispatched draft ID, prompt, and request identities. An empty restoration or confirmed discard will need an explicit session reset in the future restoration path; it must not be inferred from an ordinary response omitting `draft_id`.

`tests/buyer-chat-stop.test.mts` adds three runtime callback regressions and makes test request identities distinct. All three new regressions failed against the original implementation and pass after the change. The tests exercise callbacks with deferred mocked responses, not native React scheduling or a device.

## Seller flow compared with buyer

| Area | Seller | Buyer today |
| --- | --- | --- |
| Entry | Conversation opens offer editor; editor calls RESTORE on mount with conversation ID. | Existing create tab redirects to `/(chat)/chat`; a new provider starts with empty state. |
| Restore | Edge selects newest active draft for owned active profile + conversation, reconstructs summary, and returns saved messages. | Only SHOW_SUMMARY, CONTINUE, and PUBLISH are accepted. There is no request draft-management RPC. |
| Leave | `usePreventRemove` opens the shared popup with Salir and Descartar; leaving retains the server draft. | Android unsaved-change guard only; no saved draft resume/discard handling. |
| Discard | Conditional soft discard to `status=cancelled`, `ui_state=cancelled`, pending action null; transcript is retained. | No discard action; authenticated clients have no DELETE grant or policy. |
| Authoritative state | Draft data plus persisted messages; current offer UI does not restore every buyer-style review field. | Draft already stores data, ID, status, UI state, pending action, publication ID and update time. These must all be restored together. |

Evidence in app: `app/(modal)/offer.tsx:439` (restore application), `:572` (entry restore), `:677` (leave confirmation); `app/(tabs)/create.tsx:15` (buyer entry); `src/services/purchase.request.assistant.service.ts:13` (buyer actions).

Edge seller evidence: `supabase/functions/ai-vendedor-completar/index.ts:1945` (restore), `:1990` (soft discard). Buyer action allowlist: `supabase/functions/ai-completar/index.ts:49`.

## Concrete proposal requiring approval

Extend the existing `POST /functions/v1/ai-completar` contract with **RESTORE** and **DISCARD**, and protect terminal draft state in the database. Keep the existing buyer create entry and seller-style shared leave popup. No new navigation route, menu item, draft-manager screen, table, column, or dependency is necessary for this proposal.

### RESTORE

- Input uses the existing envelope: `prompt: ""`, `ui_action: "RESTORE"`, `active_profile_id`, optional `draft_id`, and the usual request identity.
- Resolve and verify owned active profile on the server. Without an exact ID, select the newest `draft`/`ready` for that profile with no publication link; order deterministically by update time and ID. With an exact ID, never silently substitute another draft.
- Return the existing success fields: actual `draft_id`, `status`, `updated_at`, `ui_state`, `pending_action`, `purchase_request_id`, recalculated readiness, required/optional/missing fields, category suggestions, summary and summary text. `mensaje_usuario` is null so restoration does not create a duplicate reply.
- Add `messages` containing stable message IDs, ordered roles/content and original metadata, plus fresh signed image references. Paginate the database reads so history is not silently truncated. The existing model-history loader is unsuitable: it defaults to 12 turns and drops IDs.
- Preserve `metadata.image_refs`; resolve persisted references into fresh signed URLs and map them into existing `ChatMessage.images: ChatImage[]`. Do not persist/cache signed URLs or invent references for transient attachments. Bug 15 confirms only DIRECT_SUBJECT images persist; VISUAL_REFERENCE attachments are intentionally transient.
- Format stored control markers using `metadata.ui_action`; do not show raw `[ui_action:...]` or image bookkeeping tokens in the transcript. Preserve ordinary user/assistant content, hide internal system turns, and use the existing review-instruction filter where applicable.
- Do not invoke the model, append messages, change review state, or replay a cached restore response. Recalculate readiness against current category configuration without fabricating product details.
- No latest active draft returns an empty success. Missing, cancelled, deleted, foreign-profile, or already-published exact IDs return an explicit unavailable result. Load failure keeps composition and publishing disabled and exposes retry; it must not open an apparently new empty session.
- There is no existing draft TTL. Do not invent expiration based on age. Unknown legacy statuses/contracts need explicit unsupported-state handling; preserve the rows.

Latest-draft automatic restoration matches the seller entry pattern. It does not add arbitrary multi-draft selection. Existing older active drafts stay preserved; a full list or new one-active-draft constraint would require an additional product decision.

### DISCARD and concurrency

- Input requires exact `draft_id`, `prompt: ""`, `ui_action: "DISCARD"`, resolved owned active profile and a stable retry identity.
- Match ID + active profile + active status + no publication link. Set `status=cancelled`, `ui_state=cancelled`, `pending_action=null`. Return cancelled state and clear client state only after success. Repeated discard of the same owned cancelled draft succeeds idempotently; published/foreign/missing drafts must not be changed.
- Keep draft data/messages just as seller soft discard does. Physical deletion is outside this proposal.
- Add a database guard making cancelled/published draft state terminal for assistant writes. Otherwise an in-flight BUILD can turn a cancelled draft back into ready.
- Update the existing `publish_purchase_request` implementation to lock the owned draft row and reject non-active/cancelled state before insertion, while preserving publication replay of an existing request ID. Keep the function signature and return type unchanged. This makes discard vs. publish choose a single winner.
- All buyer BUILD/control updates must use active-state predicates and check returned rows. Zero matched rows means conflict/unavailable; never return a fabricated successful update.
- Check the current owned draft before serving cached initial-request or completed-request replay. A cached ready result must not restore a cancelled/published/deleted draft in the UI.
- Protect restore, discard, controls and send with the same request/session sequencing and abort guards. Profile switching or leaving invalidates late results; a restored ID must reach every follow-up, SHOW_SUMMARY, CONTINUE and PUBLISH.

Why this is required: buyer BUILD currently rewrites state by ID/profile only (`handlers/interactionHandlers.ts:2814`); SHOW_SUMMARY/CONTINUE have the same pattern (`handlers/uiActionHandlers.ts:55` and `:90`). Completed replay can return before draft state is loaded (`index.ts:243` and `:274`). The hosted `publish_purchase_request` definition matches source and checks ownership but has no row lock or cancelled-state check (database initial migration `20260716163154_initial_remote_schema.sql:8731`).

### UI behavior after approval

Restore on the existing buyer chat entry, disable composition until authoritative loading finishes, and replace the transcript and review state as one session. Reuse the seller Salir/Descartar confirmation: Salir retains the saved draft; Descartar waits for successful server cancellation. Keep unsent-composer-loss wording accurate. Preserve the current no-history home fallback and existing Android Back precedence; no keyboard changes belong here.

The root `AGENTS.md` explicitly says: “Ask before changing public APIs, schemas, navigation structure, or established app architecture.” Approval is needed for the two added Edge action values, changed publication behavior and terminal-state database guard. The architecture skill also requires preserving public APIs unless approved. No automatic approval rejection occurred.

## Validation and integration

Executed successfully for the independent app patch:

- Focused buyer callback tests: 20 passed.
- `npm run test:unit`: 141 passed, zero failed.
- `npx tsc --noEmit`: passed.
- `npm run lint -- --no-cache`: passed.
- `git diff --check`: passed.

The worktree initially lacked dependencies; a temporary `node_modules` symlink reused the installed app dependencies for validation and was removed afterward. No dependency or lockfile change was made. The first attempted focused run failed on missing TypeScript before the link was added.

Not performed: authenticated draft restoration/discard, database mutation tests, new Edge action tests, emulator/device reproduction, hosted changes, builds or deployment. The existing source and catalog evidence establishes the blocker; it does not establish working user-visible parity.

After approval, put DB changes/tests in an isolated sibling `luppit-supabase` worktree and Edge changes/tests in an isolated sibling `ai-edge-functions` worktree. Do not modify saved main branches. Required acceptance tests: empty/latest/exact restore; full ordered history beyond 12/1000 messages; missing/legacy/unavailable drafts; fresh image signing; ready and review restoration; active-profile isolation; resume -> correction -> summary -> continue -> publish; duplicate restore/discard; stopped/late replies; discard vs. in-flight BUILD/SHOW_SUMMARY/PUBLISH; cached replay after cancellation/publication; and iOS/Android exit/cancel/no-history behavior.

Eventual release order: validated database guard/publication migration, then buyer Edge extension, then app build containing restore/discard UI. Deploy none of these in this task. The current independent app patch needs no backend deployment.

Overlap: bug 15 (`01a088f7-28cf-7c50-b0c4-9d87cd948bd7`) changes buyer `_layout.tsx`, `chat-session.context.tsx`, and the assistant service for images. Its image prompt edit is separate from this patch's state/request loop but shares the context file. Bug 16 also overlaps buyer chat; manually integrate and rerun the combined suite. Coordinate image normalization against persisted metadata rather than assuming every attachment survived.

Current changed files: `app/(chat)/chat-session.context.tsx`, `tests/buyer-chat-stop.test.mts`, and this handoff. No commit was created. The diff is in the isolated app worktree and exported to `/private/tmp/luppit-bug14-28f0.patch`.
