# Purchase conversation stages

Implements the approved [buyer/seller mockups](https://luppit-purchase-flow-mockups.jdcanales1905.chatgpt.site) for stages 1–8 and alternate closing states.

## iOS release — 2026-10-02

- App source: `d465f8b8a5caee58e974394288160ffd26afc735`; database: `a3de3cc`; Edge Functions: `522a9c6`. All three repositories are on main and synchronized with their remotes.
- iOS `1.0.0 (26)` built successfully and was submitted to TestFlight. Apple processing is `VALID`; build 26 belongs to the existing internal `Team (Expo)` group with four testers. No Android build was requested or started.
- [EAS build](https://expo.dev/accounts/luppit/projects/Luppit/builds/2b82ad9c-542c-4171-a78f-9c9f37301f33); [submission](https://expo.dev/accounts/luppit/projects/Luppit/submissions/333f39a2-79dc-4ec9-8ff0-aa0fbdb68827).
- Conversation migrations and reusable pricing are deployed. `ai-vendedor-completar` is active at version 85 with JWT verification enabled. Live readback confirmed restricted component/policy access and the preserved seller waiting guard.
- This release does not expand the partial Simulator or real-model QA coverage described below.

## UI ownership

- `app/(conversation)/_layout.tsx` owns the glass header, three-dot menu, realtime refresh, shared composer, and existing action hook.
- `ConversationStageCard` renders the DB-provided current stage, request brief, comparisons, deadlines, and primary/auxiliary actions.
- `ConversationOfferDetails` opens the existing summary popup with canonical terms and current offer photos. Unaccepted offers show a labeled shortcut without a floating amount; buyer proposals hide that shortcut until reviewed.
- `chat.tsx` owns the dated, expandable message history and image preview. `useConversationScroll` measures the current-state card and latest messages, exposes navigation above the composer, and preserves the reader's position. Opening shows the stage first; incoming messages expose an integrated new-message cue.
- Offer creation/editing, confirmations, ratings, reports, fulfillment choices, pickup codes, and grouped message sending retain their existing shared components and executors.

The replaced header/status/menu helper components, their unused SVG, and the obsolete helper test were removed. `ConversationContextControls` remains used by the offer editor; the conversation timeline service remains used by request details.

## Database contract

`20261002202253_conversation_stage_presentation.sql` lives in the sibling `luppit-supabase` repository. It adds `context.conversation_presentation` to the existing authorized conversation view and adjusts action presentation without creating a second executor or client-side lifecycle. Its SQL is identical to the locally tested `20261002181553` file; the filename matches the live deployment's recorded version.

Pending changes use the same comparison card before and during a purchase. After acceptance, the seller waits for the buyer's decision: no action, summary, menu, composer, withdrawal, dispatch, or pickup validation remains available. Existing RPCs enforce this under the same request/conversation locks, including stale popups and moderated message commits. The buyer's eligible cancellation/code actions remain secondary while review is primary.

Pickup codes remain email-only. Resending uses the existing code RPC. Scheduled pickup remains date-driven; no new readiness transition was invented. Ratings retain independent per-profile eligibility, including secondary access after negative outcomes.

The migration supports both the released action-helper view and the optional pricing wrapper through guarded source checks. The separate reusable-pricing migration is not required to apply the conversation migration.

`20261002231602_conversation_fulfillment_confirmation_copy.sql` corrects the shared seller-finalization confirmation by the agreed method: shipping uses `Registrar envío` / `Registrar`, while pickup uses `Validar retiro` / `Validar` and identifies the emailed code. Existing executors, input fields, payloads, and permissions remain unchanged. This follow-up was prompted by native testing of a dispatch action that still showed generic finalization and pickup instructions.

The reusable-pricing migration preserves an already deployed stage presentation atomically: it moves the projection to the outer pricing view and restores the active-purchase seller-withdraw guard before committing. When pricing runs first on a fresh database, the later conversation migration installs the same projection and guard. Both orders are verified.

## Validation and remaining verification

- Release integration: 18 suites / 777 database assertions and all 17 concurrency scenarios passed with conversation changes deployed before pricing. Fresh migration/seed replay and 243 stage/pricing assertions also passed.

- Release app gates: 377 tests, TypeScript, full-project ESLint, and whitespace validation passed. Earlier native iOS/Android bundle exports passed during QA; the release request authorizes only iOS.
- Database: the released schema passed 15 applicable suites / 688 assertions and 16 concurrency scenarios. The branch with optional pricing passed 18 suites / 758 assertions and all 17 concurrency scenarios. Both fresh resets and seeds passed in a separate disposable local stack. The stage matrix covers 28 scenarios for both roles, including 160 stage/guard assertions. Pricing-only checks were explicitly excluded from the released-schema run.
- Conversation presentation and confirmation-copy migrations are deployed as `20261002202253` and `20261002231602`. Reusable pricing is now deployed as `20261001145337`; live readback confirmed the stage projection runs once after pricing, the seller waiting guard remains, and private helper access stays restricted. The release request includes syncing all three repositories to main and submitting only iOS to TestFlight.
- Simulator: verified the buyer's pending-change card, review-only primary action, overflow menu without an acceptance bypass, shared review/comparison popup, expandable history, and image preview. Both empty and wrapped drafts fit above the software keyboard after correcting excess iOS home-indicator padding through the shared keyboard visibility hook. No purchase decision or message was submitted.
- Continued Simulator QA verified the seller's pending-change card, read-only review, withdrawal confirmation, full comparison-body scrolling, availability confirmation, overdue shipping/pickup cards, pickup-code validation form, completed pickup, eligible rating button/form, already-rated notice, and report form. All opened forms were cancelled without submitting a decision, rating, report, message, or fulfillment action.
- The confirmation-copy follow-up passed all 179 stage assertions in a disposable database transaction that rolled back. It was deployed as version `20261002231602`; live authorized views returned the distinct shipping/pickup titles, descriptions, and confirm labels. Private-helper permissions remained restricted. The disposable database was stopped, retaining its backup; the existing local stack remained healthy.
- Native QA remains partial: the Mac locked during the corrected-popup recheck. The rendered copy after the follow-up and remaining buyer screens are pending. Stages without current account fixtures (initial request, private draft, scheduled pickup, active emailed code, an active-purchase proposal lock, in-transit/late-delivery decisions, and negative final outcomes) remain covered by database tests rather than direct Simulator proof. The stale LAN connection was replaced with the existing localhost development server before testing.
- The seller request brief uses the exact request snapshot captured when a new conversation is created; existing conversations retain their stored-message fallback. Request-assistant photos currently have no seller-sharing contract; later conversation photos are not relabeled as request references.

## Bug batch integration — 2026-10-04

All five completed application branches and four database branches were merged into main, retaining their original commits. At integration, its four migrations had not been applied to the hosted database and no new app release was made. Their subsequent database deployment is recorded below.

| Item | Result | App commit | Database commit |
| --- | --- | --- | --- |
| B01 | Analysis only: retained photo observations and the second readiness review can reopen an answered discrepancy. The prompt already prioritizes explicit seller corrections, but the flow lacks structured resolution of the pending question. No Edge Function change was requested or made. | — | — |
| B02 | Seller request ellipsis and authorized request/profile-scoped bulk discard, retaining ineligible purchases and history. | `9abc7ae` | `e4c75d2` |
| B03 | Generic compact proposal comparison, full details, labelled photos and explicit required delivery selection. | `6684bea` | `1a2a4c5` |
| B04 | Responsive canonical-summary control keeps the amount and label inside the glass surface. | `32d479b` | — |
| B05 | DB-owned deadline labels distinguish availability from completion limits and explain overdue behavior. | `47a8d8b` | `b6a0cd4` |
| I01 | Approved navigation above the composer, Mostrar/Ocultar mensajes, immutable request context and brief SYSTEM publication events for new conversations. Existing stored messages are preserved. | `28d915f` | `74ebe58` |

Migrations replay in version order: `20261003195303_b02_seller_request_discard_all`, `20261004013000_conversation_deadline_clarity`, `20261005033153_i01_chat_navigation`, then `20261005033602_b03_generic_proposal_review`. The full chain contains 102 migrations. A fresh reset exposed that the baseline action/role catalogs are populated by the seed after B02 runs; the seed now installs its two discard transitions idempotently. Conversation catalog, authorized-RPC and single-menu-action tests were updated to the current contracts without changing those runtime rules.

Combined verification passed: 398 app tests, TypeScript, full-project ESLint, a fresh migration/seed reset, all 63 database suites / 1,912 assertions, public/private SQL lint at error level, four bulk-discard races and 17 proposal/fulfillment races. SQL and race tests ran only in an isolated local stack and disposable clones. All task commits and both previous main baselines remain ancestors of main; task worktrees were clean when audited.

Native coverage remains the individual task coverage: I01 navigation/keyboard and B04 layout fixtures passed native checks; B02 menu, B03 comparison and B05 deadline integration still need native QA. B03/B05 browser checks and SQL tests do not constitute a native or deployed pass. B01's six simulated tests do not establish real-model behavior.

## Automatic chat summaries follow-up — 2026-10-04

The hosted database still used the old request/offer message producers because the merged migrations were pending. The user chose to retain existing chats. New request conversations now capture private seller context without creating a buyer message. Offer publication creates no summary or brief SYSTEM event; the response retains `publication_message_id` as null. Explicit conversation photos, canonical pricing, offer-created notifications and purchase history remain available.

Migration `20261005045451_conversation_without_summary_messages` and the four pending batch migrations were applied through the linked CLI. All 103 hosted migration versions exactly match the repository. The five request/publication/list function definitions match the tested local definitions, and private request context has RLS with no anonymous/authenticated table-read grants. All 293 pre-deployment messages retain the same content digest.

Verification passed a fresh migration/seed replay, all 63 database suites / 1,916 assertions, and public/private SQL lint at error level. No native QA or new app build was performed for this database-only follow-up. Security advisors reported no errors; existing extension, public-RPC and Auth warnings remain outside this change.
