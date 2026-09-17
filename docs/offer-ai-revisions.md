# Seller AI revisions before acceptance

The seller opens `modal.offer.edit` from either **Modificar** action. The existing assistant restores a separate private edit draft from the current offer, including its real photos and normalized pricing/fulfillment. Negotiated obligations belong in the description. Leaving preserves the draft; discarding closes that draft only. Publication is an explicit **Actualizar oferta** action and retains the offer and conversation IDs.

## Contracts and invariants

- The Edge request uses `mode: create | edit`, defaulting to creation. `RESTORE` begins/resumes editing without a model call. Turns carry `expected_draft_version`; publication also carries `expected_offer_revision`.
- `offer_draft.mode`, `base_offer_revision`, `published_offer_revision`, and `draft_version` distinguish immutable historical sessions from the single active private draft. Creation uniqueness remains scoped to `mode=create`.
- `begin_seller_offer_edit`, `get_seller_offer_edit_draft`, `save_seller_offer_edit_draft`, `discard_seller_offer_edit`, and `publish_seller_offer_revision` enforce ownership and version checks. Save and publish validate current lifecycle eligibility. Private messages never enter `conversation_message`.
- Publication locks request → conversations → offer → draft, matching acceptance. It atomically writes the reviewed draft, UNIT/TOTAL pricing, quantity, fulfillment, selected photos, public summary and update notification. Repeated publication returns the sent draft without side effects.
- Current photos are authoritative `offer_images`; historical attachments have separately signed URLs. Removing a current photo preserves public and private history. Restoring a removed photo requires a known canonical reference. Reference images do not satisfy readiness.
- The acceptance revision hashes deterministic photo paths along with price, quantity, currency, description and fulfillment. A stale acceptance popup closes when the conversation refresh supplies a different revision. The buyer must review again and select a delivery method.
- Publication emits a private `conversation_changed` invalidation for both `view` and `messages`. Offer/home lists reload through their existing focus handlers. Published summary/images share a message group starting at index 1 so the existing offer-update notification owns the push rather than generating a push per attachment.
- Unchanged drafts cannot publish. Ineligible offers cannot be edited. A stale draft save requires restoration; an externally changed offer requires explicit discard/restart. No automatic merging or publication occurs.

## Deployment sequence

There are two database migrations in the sibling `luppit-supabase` repository. Keep them in separate production deployment stages:

1. Apply `20260917060718_offer_ai_revisions.sql` first. It creates the contracts and safeguards but leaves the edit actions disabled.
2. Deploy the updated `ai-vendedor-completar` function from `ai-edge-functions` and the app code. Creation remains the default request mode.
3. Complete authenticated seller/buyer end-to-end QA, including native iOS/Android input, photos, leave/resume/discard, acceptance conflicts, realtime refresh and notification navigation. Confirm actual model behavior for negotiated terms and ambiguous photos.
4. Apply `20260917061013_enable_offer_ai_edit_actions.sql` last. It enables only the seller's two existing Modificar actions in OFFER_MADE; cancellation stays available. Fresh-install seed metadata matches this final state.

If the deployment workflow applies every pending migration, do not include the activation migration in the first release batch. Use the repository's existing protected deployment process; no production seed or database reset is needed. No old-build compatibility gate is required.

Rollback disables just these actions; retain published offers and all draft history:

```sql
update public.conversation_status_role_action rule
set is_enabled = false
from public.conversation_action action, public.role actor
where action.id = rule.action_id and actor.id = rule.role_id
  and actor.role_code = 'SELLER' and rule.status_code = 'OFFER_MADE'
  and action.code in ('SELLER_MODIFY_OFFER', 'SELLER_MODIFY_OFFER_MENU');
```

## Verification

App: `npm run test:unit`, `npx tsc --noEmit`, `npm run lint`, and `git diff --check`. The targeted editor tests cover initialization, reviewed-version publication, no-op drafts, stale recovery, attachment-only history, retries and stale acceptance confirmations.

Edge: run the seller Deno tests and `deno check supabase/functions/ai-vendedor-completar/index.ts` from the Edge repository, plus `node --test supabase/tests/functions/*.test.mjs`. Model outputs are mocked in handler tests; these do not prove live model quality.

Database: run `supabase test db supabase/tests/database/*.test.sql` in the sibling repository. `offer_ai_revisions.test.sql` covers price/quantity preservation, private save/replay, publication deduplication, permissions, photo replacement/history, notification/push counts, acceptance/cancellation and TOTAL quantity summaries. The activation assertions exercise both Modificar and Cancelar through the real conversation-view RPC.

Run `python3 supabase/tests/concurrency/offer_ai_revisions.py` for real simultaneous transactions. It clones the **local** Supabase database into a disposable database, preserves application functions and permissions, excludes managed cron/GraphQL extension metadata, and removes the copy afterward. It never resets the source database or connects to a hosted database. Cases: seller publication first, buyer acceptance first, duplicate publications, and competing draft saves.

Local database testing initially found that the existing realtime stack lacked today's messages partition. A current-day partition was created only in that local stack to permit invalidation checks. This was not a production schema change. SQL tests prove event creation, not websocket receipt or OS push delivery.

Native Expo exports verify iOS/Android bundling, not device interaction. No hosted database/Edge deployment, live model session, authenticated device end-to-end run or store build is implied by these checks.

Recorded validation for this implementation:

- App: 233 unit tests passed; TypeScript and lint passed.
- Edge: 76 seller tests and 23 shared function tests passed after integrating the existing deployed safeguards; seller function type check passed.
- Database: 1,322 pgTAP assertions across 45 files passed, including 53 revision assertions and actual invalidation payload creation.
- Four real concurrency scenarios passed in disposable local databases.
- iOS and Android Hermes exports passed; this is bundle evidence only.
- Both migrations were applied locally and subsequently deployed to the hosted project as recorded below.
- Remaining release checks: live model behavior, authenticated native seller/buyer flows, websocket receipt, push receipt and notification navigation. An iOS simulator is available; no Android test device was connected.

## Deployment record — 2026-09-17 UTC

At the user's explicit request to deploy for local-main testing, the authenticated Supabase connector applied `offer_ai_revisions` as version `20260917060718`, deployed `ai-vendedor-completar` version **74**, then applied `enable_offer_ai_edit_actions` as version `20260917061013` to `mesycgfytnbxpikcuqmb` (`LuppitDB`). The CLI lacked an access token; no credentials were copied or exposed. The migration filenames and local history were aligned with the connector-assigned versions without changing their tested SQL.

Before deploying, source comparison found that the canonical Edge checkout lacked some changes already running in version 73. Those seller delivery, real-photo readiness, transcript restoration and retry safeguards were merged with the revision implementation, with their regression tests, before deploying version 74. All 14 deployed files match the final source. JWT verification remains enabled; OPTIONS returned 200 and unauthenticated POST returned 401.

Hosted readback confirms both Modificar actions and both Cancelar actions are enabled. Runtime verification passed before and after deployment. All five new public revision RPCs allow authenticated callers and deny anonymous callers. The advisor delta consists of those five intentional authenticated SECURITY DEFINER entrypoints; ownership and eligibility are checked inside each RPC.

Activation was explicitly requested to permit the user's end-to-end app testing; the remaining native and live-model checks above are still pending. No seed, database reset, user-offer mutation, app-store build, or Git remote push was performed by this deployment.


## Offer editor UX — 2026-09-17

The edit assistant leads with the saved offer photo, quantity and price. Its card is labelled **Oferta actual** while unchanged and **Cambios propuestos** after private revisions; it must never label revised draft terms as published. Offer details and the original buyer request expand independently. Expansion does not auto-scroll the transcript. The short composer prompt and initial assistant guidance stay separate from the private history. Review still shows the authoritative photo set and is the only place that can publish an update.

The exit confirmation uses the existing shared summary popup without changing its component or horizontal action layout. Buttons match the other draft confirmations: **Salir** on the left with a white background and dark text; **Descartar** on the right with a red background and white text. **Salir** retains the saved draft. The existing close control, backdrop and sheet dismissal return to editing. Unsent composer text/photos are explicitly called out on both platforms.

Validation: 239 app unit tests passed, including pricing, restored draft labels, disclosures, scroll behavior, exit/discard callbacks and unsent-content copy. TypeScript, lint and diff checks passed. Native iPhone 17 Pro / iOS 26.5 inspection verified the compact editor, full conditions and buyer-request disclosures, horizontal popup, close/backdrop dismissal, leaving for the conversation and reopening the retained draft. No live message, discard or publication was performed. Android rendering, large accessibility text and software-keyboard layout remain device QA checks.
