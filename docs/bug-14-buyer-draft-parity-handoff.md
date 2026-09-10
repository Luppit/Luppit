# Bug 14: buyer request draft resume and discard

Status: approved scope implemented and committed in isolated app, Edge, and database worktrees. Local validation passed. The parent task owns integration into the saved main checkouts. Hosted deployment and physical-device acceptance remain pending.

## Exact revisions and integration

| Repository | Required base | Implementation commit |
| --- | --- | --- |
| App | `eb888b60a43bb1c37b16870f91440602b87d52d7` | `1eebdd4d44cd5f481d6dc46914ac60dd36b431aa` |
| Edge | `59650952691767bda0ef8433a7cc40007c3465df` | `390b6c6315913137f92db4dfbe973d5820b60bf6` |
| Database | `f16a3cda5aedfc38e0aa2810b19c857ddf3a8e35` | `906ec97a483334062b86ea3215136bf00f044dd3` |

This document is updated in a subsequent documentation commit on the same app branch. Integrate the branch tip to include it.

Worktrees: `/Users/josedanielcr/.codex/worktrees/28f0/Luppit`, sibling `ai-edge-functions`, and sibling `luppit-supabase`. Branches: `codex/bug14-buyer-draft-parity`, `codex/bug14-request-draft-parity`, and `codex/bug14-request-draft-lifecycle`.

The app base already combines the initial draft-identity fix (`bed74dc`), bug 15 image support, and bug 16 keyboard-wrapper changes. The final app changes preserve those integrations. Edge builds on bug 15's `5965095`; it retains DIRECT_SUBJECT persistence and transient VISUAL_REFERENCE behavior. No dependency or lockfile change was added. No generated database types change is needed: the publication RPC signature is unchanged.

Release order: apply the database migration, deploy `ai-completar` from the deployable Edge source, then run/build the app containing this change. Merely integrating Git branches does not enable RESTORE/DISCARD on the hosted endpoint. An older endpoint rejecting RESTORE leaves the app in its explicit retry state with composition disabled; it cannot safely pretend no draft exists.

## Resulting behavior

The existing buyer create entry automatically loads the newest active draft owned by the selected profile. It restores the actual ID, ordered transcript, current readiness/requirements, pending action, review state, summary, and fresh signed references for persisted images. No draft manager, menu item, route, table, column, or TTL was added. Older active drafts remain preserved; this entry selects the newest deterministically.

The shared seller-style leave popup offers **Salir** and **Descartar**, accurately warns about unsent text/photos, and only shows its close button on Android. Salir retains server state. Descartar waits for confirmed soft cancellation. Failed discard stays open and retries with the same request identity. Native Back and the visible close button retain the existing Home fallback when navigation history is absent.

Loading and errors block composition and publication. Retry reloads authoritative state. An owned draft with an unsupported contract returns its ID with `REQUEST_DRAFT_UNSUPPORTED`, allowing explicit discard from the leave popup while sending/publishing remain blocked. Missing, foreign, and terminal exact IDs return unavailable without substituting another draft. No unsupported contract is fabricated or silently deleted.

Saved message IDs and order are retained. Metadata-backed user control/image markers are normalized, internal assistant control JSON is omitted, actual prose/JSON is preserved, and system turns are hidden. Persisted image references are signed through the authenticated Storage client and limited to the active profile's bucket prefix. Transient or missing image-only attachments use an unavailable placeholder.

All send/control paths preserve server draft identity and exact retry payloads. Requests share cancellation/session guards; profile switches and unmounts invalidate late responses. A restored review can continue, show summary, and publish using the same draft ID.

## Endpoint and database safeguards

`POST /functions/v1/ai-completar` adds RESTORE and DISCARD using the existing request envelope and owned-profile resolution. These actions invoke no model. RESTORE does not mutate conversation/review state or use cached restore replies. History loads in 500-message pages. A processing-claim check, transcript-tail check, and final draft-state check reject a snapshot affected by an overlapping turn.

DISCARD requires an exact owned ID and conditionally sets active, unpublished drafts to `cancelled`; repeating an already-cancelled owned draft succeeds. Data and transcript are retained. Every buyer draft update checks active status and absence of a publication link, and verifies that a row was updated. Cached initial/completed replies resolve current ownership and terminal state before returning. Transcript persistence precedes replay completion in the deployable entry point.

Migration: `supabase/migrations/20260910041954_protect_request_draft_terminal_state.sql` in the database repository. SHA-256: `96741ec762a871bc4c5fb854da9e1909c6eea9a6c7093e8dd43fed284141d193`.

The trigger prevents cancelled/published status from being revived. The existing publication RPC locks the owned draft row, rejects inactive/cancelled state, and returns the existing purchase-request ID for publication retries. Discard and publish therefore cannot both win. Physical deletion permissions and the existing RPC signature/grants remain unchanged.

The root and deployable copies of changed buyer helpers/handlers agree. Their entry points retain their pre-existing architectural differences; deploy from `supabase/functions/ai-completar/`.

## Executed validation

| Evidence | Result and limit |
| --- | --- |
| App unit suite | **175 passed**, zero failures. Includes the existing integrated bug 15/16 tests and updated Android Back fixture. |
| Focused buyer session/service suite | **46 passed**. Executes actual callbacks with controlled hooks/deferred transport. Covers restore/review/images, exact retry identity, late responses, legacy recovery, iOS/Android popup configuration, unsent warning, discard failure/success, pending-control lock, and Home fallback. It does not exercise native rendering or React scheduling. |
| App static checks | `npx tsc --noEmit`, `npm run lint -- --no-cache`, and `git diff --check` passed. Existing installed dependencies were reused through a temporary symlink, removed after validation. |
| Edge suite | **222 passed**, zero failures. Includes full ordered restoration of 1,005 messages, in-flight/completed transcript races, ownership/signing, legacy recovery, guarded writes, and terminal replay behavior. |
| Edge checks | `deno check index.ts supabase/functions/ai-completar/index.ts` and `git diff --check` passed. |
| Full isolated Supabase tests | **43 files / 1,221 assertions passed**, including 16 new lifecycle tests. Applies real migrations, RLS, triggers, and RPCs to a separate local stack. |
| Concurrent database review | Parent independently ran the exact migration hash on PostgreSQL 17: discard-first prevents publication; publish-first prevents discard; publication replay returns the same ID. This minimal fixture complements, rather than replaces, full Supabase tests. |
| Local authenticated endpoint | **28 checks passed** against the actual deployable Deno handler over loopback and the isolated Supabase Auth/REST/Storage/RPC services. Uses synthetic users, category, drafts, transcript, and a tiny image fixture. |

The HTTP checks verified empty/latest/exact restore, stable 30-message history beyond the model's history window, review/normal reentry, fresh owned image signing, foreign profile/draft rejection, same-ID CONTINUE/SHOW_SUMMARY/PUBLISH, duplicate publication returning one persisted request, published/cancelled exclusions, idempotent discard, retained transcript, terminal cached replies, and unsupported-contract discard recovery. OpenAI access was absent and network access was restricted to loopback; no model behavior was evaluated.

Local harness caveat: Colima's database clock was slightly ahead of macOS, causing the existing replay `updated_at >= created_at` constraint to reject a fast control completion. A runner-only +2-second Date shim compensated for that local skew. Production source and database schema were unchanged for this fixture issue.

Local evidence: `/private/tmp/bug14-local-endpoint-report.json`, `/private/tmp/bug14-db-all-tests.log`, `/private/tmp/bug14-edge-tests.log`, `/private/tmp/bug14-app-unit.log`, and the parent's `/private/tmp/luppit-bugs14-16-integration-lf73ijs1/draft-sql-review.json`. Temporary files are session evidence, not deployment artifacts.

## Remaining acceptance

No hosted writes, Edge deployment, release build, store submission, emulator session, or physical-device QA was performed by this task. The local HTTP runner is not the hosted Supabase Edge runtime. Hosted data/configuration and actual model correction/image semantics still require live acceptance after deployment.

On iOS and Android, verify opening an existing draft; restored images and review; editing then leaving/reopening; Salir, popup dismissal, and Descartar; native gestures/Back with keyboard visible; profile switching while loading; slow/offline retry; publishing once; and reopening after cancellation/publication. Confirm that the combined bug 15 image flow and bug 16 keyboard layout render correctly on physical devices. Source/callback tests do not establish visual or device parity.
