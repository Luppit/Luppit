# Purchase conversation stages

Implements the approved [buyer/seller mockups](https://luppit-purchase-flow-mockups.jdcanales1905.chatgpt.site) for stages 1–8 and alternate closing states.

## UI ownership

- `app/(conversation)/_layout.tsx` owns the glass header, three-dot menu, realtime refresh, shared composer, and existing action hook.
- `ConversationStageCard` renders the DB-provided current stage, request brief, comparisons, deadlines, and primary/auxiliary actions.
- `ConversationOfferDetails` opens the existing summary popup with canonical terms and current offer photos. Unaccepted offers show a labeled shortcut without a floating amount; buyer proposals hide that shortcut until reviewed.
- `chat.tsx` owns the dated, expandable message history and image preview. Opening shows the stage first; incoming messages preserve an older reading position and expose a new-message control.
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
- The seller request brief uses the exact seeded buyer request text. Request-assistant photos currently have no seller-sharing contract; later conversation photos are not relabeled as request references.
