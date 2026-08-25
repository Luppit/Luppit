# Luppit MVP Functional Acceptance Test Tracker

Version: 2.0<br>
Prepared: 2026-08-18<br>
Scope: Expo application, `../luppit-supabase`, `ai-edge-functions`, and live Supabase project `LuppitDB`<br>
Purpose: prove that Luppit's intended buyer/seller product works first, then perform release hardening and evidence-based MVP sign-off

## 1. How to use this file

1. Copy this file for each release candidate and name it with the build and date.
2. Complete the run header and the small Phase 1 fixture table.
3. Run **Phase 1A in order**. It proves the complete product journey from account creation through a completed transaction and deletion.
4. Run **Phase 1B**. It proves the other vital account, screen, query, and lifecycle behavior.
5. **Stop if a Phase 1 P0 fails.** Log the bug, fix it, and retest it before starting Phase 2. Technical hardening cannot compensate for a broken product journey.
6. Start Phase 2 only after the Phase 1 sign-off gate is complete.
7. For each case, change `Done` from `[ ]` to `[x]` only after recording a result.
8. Use only `PASS`, `FAIL`, `BLOCKED`, or `N/A` in `Result`.
9. Add a screenshot, screen recording, log, query result, email, or CI URL for every P0 case.
10. Create a bug-log row for every failure. Put its bug ID in the test case and the test case ID in the bug.
11. After a fix, keep the original result and record the retest in the bug log. Do not erase failure history.
12. Complete every section summary and the final sign-off. `MVP READY` is allowed only when all release gates below are satisfied.

### Result and priority legend

| Value   | Meaning                                                                    |
| ------- | -------------------------------------------------------------------------- |
| P0      | Launch-critical path, security/privacy boundary, or irreversible operation |
| P1      | Important product quality or common secondary path                         |
| P2      | Polish or low-frequency behavior that may be deferred with owner approval  |
| PASS    | Actual result matches the expected result with evidence                    |
| FAIL    | Actual result differs from expected; a bug ID is required                  |
| BLOCKED | The test cannot be executed; blocker and owner are required                |
| N/A     | Not applicable to this release; reason and approver are required           |

### Non-negotiable MVP release gates

- [ ] Phase 1A guided journey passes in order, including one shipping transaction and one pickup transaction.
- [ ] Every Phase 1 P0 is `PASS`; no vital product behavior is deferred to Phase 2.
- [ ] Every P0 case is `PASS`; no P0 is `N/A` without written product/security approval.
- [ ] At least 95% of applicable P1 cases pass, and every remaining P1 has an explicit disposition.
- [ ] No open Blocker or Critical bug exists.
- [ ] No open Major bug exists in authentication, profile isolation, discovery, request publication, offers, conversations, fulfillment, identity/business verification, notifications, safety, or deletion.
- [ ] The smoke suite passes on one physical iOS device and one physical Android device using the exact release build.
- [ ] App commit, database migration state, Edge Function inventory, cron jobs, Storage buckets, and runtime configuration show no unexplained drift.
- [ ] External boundaries are proven in staging: OTP/email, Didit, OpenAI, moderation, Storage, Realtime, push, cron/Vault, and deletion worker.
- [ ] Privacy, deletion, legal publication, backup/restore, and operational-alert gaps are either completed or accepted in writing by the accountable owner.
- [ ] Every P0 case and release gate has dated evidence tied to the release build/commit.
- [ ] Product owner and technical owner sign the final decision.

## 2. Test run header

| Field                             | Value                                  |
| --------------------------------- | -------------------------------------- |
| Release/build                     |                                        |
| App commit SHA                    |                                        |
| Database commit SHA               |                                        |
| Edge Functions commit SHA         |                                        |
| Environment                       | Staging / Production-like / Production |
| Supabase project ref              |                                        |
| Database latest migration         |                                        |
| Edge Function deployment versions |                                        |
| Test start/end                    |                                        |
| Lead tester                       |                                        |
| Other testers                     |                                        |
| iOS device / OS                   |                                        |
| Android device / OS               |                                        |
| Network profiles used             | Wi-Fi / cellular / slow / offline      |
| Evidence folder URL               |                                        |
| Bug tracker URL                   |                                        |
| Notes                             |                                        |

# PHASE 1 — VITAL FUNCTIONAL VALIDATION

This phase answers one question: **can real buyers and sellers use Luppit for its intended purpose from beginning to end?** Do not start deployment, security, resilience, or operational hardening until this phase passes.

The intended product loop is:

`create account → complete role setup → buyer describes need with AI → request is published → matching seller discovers it → seller creates an offer with AI → buyer accepts → both coordinate → shipping or pickup completes → both rate`

## Phase 1 setup — only what is needed to prove the product

Use staging or safe test data. Never record passwords, access tokens, OTPs, or raw identity documents here.

| Fixture            | Needed for                                                         | Reference | Ready? | Notes                                                     |
| ------------------ | ------------------------------------------------------------------ | --------- | ------ | --------------------------------------------------------- |
| Buyer A            | Fresh buyer signup, two requests, shipping and pickup completion   |           | [ ]    | Fresh CR phone and inbox                                  |
| Seller A           | Fresh seller signup, approved business, shipping and pickup offers |           | [ ]    | Fresh CR phone and inbox                                  |
| Seller B           | Competing-offer closure test                                       |           | [ ]    | Approved business matching Buyer A's category             |
| Dual-profile user  | Profile creation, switching, and isolation                         |           | [ ]    | One buyer and one seller profile                          |
| Disposable account | Profile and full-account deletion                                  |           | [ ]    | Contains no valuable data                                 |
| Request data       | Two main requests plus spare reject/cancel/discard requests        |           | [ ]    | Use different titles so they are easy to identify         |
| Deadline fixtures  | Past-due acceptance and shipment conversations                     |           | [ ]    | Ask a technical helper to prepare these; do not wait days |
| Devices            | Buyer and seller sessions at the same time                         |           | [ ]    | Prefer two devices; simulator is acceptable for Phase 1   |

## Phase 1A.1 — Guided founder journey: onboarding through offer draft

Run these rows **in order**. This is the fastest proof that the app's actual intention works. Unless a row says otherwise, do not repair data manually between steps.

| Done | ID       | P   | What this proves                       | How to test                                                                                                                                 | Expected result                                                                                                                      | Result | Evidence / observations                                                                                                                                                                                                                                                       | Bug ID           |
| ---- | -------- | --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| [x]  | VITAL-01 | P0  | Signed-out entry and legal access      | Fresh-install/open with no session. Open Terms and Privacy, return, and try a protected tab or saved link.                                  | Welcome/auth and legal pages work; no private screen or data flashes.                                                                | PASS   |                                                                                                                                                                                                                                                                               |                  |
| [x]  | VITAL-02 | P0  | Buyer account creation                 | Choose Buyer, use a fresh 8-digit CR phone, accept legal, enter one wrong phone OTP, then the correct one.                                  | Wrong code creates no session; correct code creates exactly one account and continues once.                                          | PASS   |                                                                                                                                                                                                                                                                               |                  |
| [x]  | VITAL-03 | P0  | Buyer identity onboarding              | Complete the Didit sandbox flow, close/reopen once while it is pending, then refresh after approval.                                        | Progress resumes at the real state; verification creates/activates exactly one buyer profile.                                        | PASS   | Pending Didit correctly resumes at **Continúa tu verificación** after relaunch, but the screen originally had no way to cancel the unfinished verification and leave the forced onboarding route.                                                                              | BUG-018          |
| [x]  | VITAL-04 | P0  | Required buyer email                   | Enter a mixed-case email, opt in, enter one wrong 4-digit email code, then the correct code.                                                | Wrong code changes nothing; correct code verifies the normalized email once and removes the gate.                                    | PASS   |                                                                                                                                                                                                                                                                               |                  |
| [x]  | VITAL-05 | P0  | Sign-out, sign-in, and session restore | Sign out, sign back in with phone OTP, force-close, and reopen.                                                                             | Sign-out clears private UI; sign-in restores the same buyer; relaunch has no auth/onboarding loop.                                   | PASS   |                                                                                                                                                                                                                                                                               |                  |
| [x]  | VITAL-06 | P0  | Seller account creation                | On the second account choose Seller and complete phone OTP, legal acceptance, and Didit.                                                    | Exactly one seller profile/onboarding record exists and resumes at the correct setup step.                                           | PASS   | Founder retest: complete and working, including the revised email-conflict and seller-setup guidance.                                                                                                                                                                        |                  |
| [x]  | VITAL-07 | P0  | Seller email and business submission   | Verify seller email, add required RNP/evidence files, and submit business verification.                                                     | One valid application becomes Pending/In review; evidence remains private; the restricted state is honest.                           | PASS   | Founder retest: complete and working.                                                                                                                                                                                                                                          |                  |
| [x]  | VITAL-08 | P0  | Seller approval and setup              | Approve the current application normally. Reopen the app; set business name, province/canton/district, and at least one category.           | One business is linked to the seller as owner; seller home unlocks only after required setup is complete.                            | PASS   |                                                                                                                                                                                                                                                                               |                  |
| [ ]  | VITAL-09 | P0  | Multiple profiles and isolation        | Create Buyer under Seller A's login. Switch seller→buyer→seller and revisit Home, Chats, Notifications, and Profile.                        | Both profiles appear once; role UI/data changes; requests, unread counts, drafts, filters, and notifications never leak.             |        |                                                                                                                                                                                                                                                                               |                  |
| [x]  | VITAL-10 | P1  | Every core screen is reachable         | Under both roles tap every bottom tab. From Profile open Notifications, Help, Settings, Terms, Privacy, and Business where shown. Use Back. | Every configured screen opens with a deliberate data/empty state and returns without crash, blank screen, wrong role, or route loop. | PASS   | Founder retest: complete and working.                                                                                                                                                                                                                                         |                  |
| [x]  | VITAL-11 | P0  | Buyer AI understands intent            | As Buyer A describe a realistic item, answer follow-ups, then correct one important earlier detail.                                         | One continuous draft is used; questions are relevant; the correction replaces stale information.                                     | PASS   | Founder retest: complete and working, including multiline input and recovery of interrupted AI turns.                                                                                                                                                                        |                  |
| [x]  | VITAL-12 | P0  | Buyer AI review is truthful            | Continue to review and compare title, category, brand/preferences, and attributes with what you said.                                       | Summary reflects the final intent; required information is present; nothing material is invented or stale.                           | PASS   |                                                                                                                                                                                                                                                                               |                  |
| [x]  | VITAL-13 | P0  | Request publishes once                 | Tap Publish twice quickly, then use the success CTA.                                                                                        | Exactly one active request is created; one success state appears; CTA opens that request.                                            | PASS   |                                                                                                                                                                                                                                                                               |                  |
| [x]  | VITAL-14 | P0  | Request screens and queries agree      | Find the request on buyer Home, open detail/timeline, refresh, relaunch, and search/filter for its unique title.                            | The same request appears once with matching title, status, offers, and views; persisted data survives relaunch.                      | PASS   |                                                                                                                                                                                                                                                                               |                  |
| [x]  | VITAL-15 | P0  | Seller discovery works                 | As Seller A use home/category/search filters to find Buyer A's request and open it.                                                         | The eligible request appears with the same buyer-safe content and DB-provided status.                                                | PASS   |                                                                                                                                                                                                                                                                               |                  |
| [x]  | VITAL-16 | P0  | Opening reuses one conversation        | Back out and open the same request twice more; inspect Chats.                                                                               | All opens lead to one `REQUEST_OPENED` conversation and one chat row; no duplicate visualization side effect.                        | PASS   |                                                                                                                                                                                                                                                                               |                  |
| [x]  | VITAL-17 | P0  | Pre-offer behavior is correct          | Open the new conversation as buyer and seller and inspect available actions/composer.                                                       | Request summary/title is visible, but neither participant can message before an offer exists.                                        | PASS   | Founder retest: complete and working on the tested device. Android App Links still require a production-signing verification pass.                                                                                                                                           | BUG-007          |
| [x]  | VITAL-18 | P0  | Seller AI builds a usable offer        | Choose Offer, use multiple turns, attach a real product photo, enter price/currency and shipping, then correct one detail.                  | One draft is retained; the correction sticks; valid photo and fulfillment values appear in the review.                               | PASS   | Draft restore/discard behavior works. New UX finding: **Descartar borrador** should not live in the transcript; closing with X should offer only **Salir** or **Descartar**.                                                                                                    | BUG-019          |

Section result: **IN PROGRESS — 17 PASS / 0 FAIL / 1 NOT RECORDED**<br>
Observations: The founder retest confirms seller onboarding, core screens, buyer AI, sharing on the tested device, and offer-draft behavior. VITAL-09 still has no recorded result.<br>
Open bugs/blockers: BUG-019 is implemented and awaits focused UX retest. BUG-018 still awaits a final cancellation/navigation retest. BUG-007 still needs the production Android signing SHA-256 before Android App Links can be verified.<br>
Tester/sign-off/date:

## Phase 1A.2 — Guided founder journey: offer publication through deletion

| Done | ID | P | What this proves | How to test | Expected result | Result | Evidence / observations | Bug ID |
|---|---|---|---|---|---|---|---|---|
| [x] | VITAL-19 | P0 | Offer publishes once | Tap Publish twice quickly; inspect the conversation and seller Offers list. | One complete offer exists; conversation becomes `OFFER_MADE`; offer appears once in list and chat. | PASS | | |
| [x] | VITAL-20 | P0 | Sent offer stays synchronized | Before acceptance edit price, description, fulfillment, or image; save and refresh both devices. | The same offer updates everywhere; buyer detail, chat summary, and seller list agree; no duplicate is created. | PASS | | |
| [x] | VITAL-21 | P0 | Buyer can evaluate seller | As buyer open the offer and seller business profile. | Price, currency, photo, methods, business name, location, categories, and rating agree; no private business data leaks. | PASS | Founder retest: complete and working for both counterpart entry points. | |
| [x] | VITAL-22 | P0 | Messaging and realtime work | While `OFFER_MADE`, exchange text and one valid image both ways. Background one device, send another message, then return. | Each logical message appears once in order; images open; unread/preview update; backgrounded device catches up. | PASS | Founder retest of the base text/image/realtime flow: complete and working. | |
| [x] | VITAL-23 | P1 | In-app notification behavior works | Trigger an offer/message notification, open Notifications, tap it, then read/dismiss it. | It belongs to the active profile, opens the correct request/chat, and updates unread state consistently. | FAIL | New retest finding: one logical send containing text and three images can render out of order as two grouped images, then text, then the remaining image. This is tracked with the grouped-message regression because it occurs before notification presentation. The notification screen also needs visual cleanup to match app standards. | BUG-012, BUG-020 |
| [x] | VITAL-24 | P0 | Buyer accepts a shipping offer | Buyer selects Accept, chooses Shipping, reviews the confirmation, and confirms. | Conversation becomes `OFFER_ACCEPTED`; request selects that offer; method is frozen; seller sees the next action. | PASS | Everything worked as expected. | |
| [x] | VITAL-25 | P0 | Seller commits to fulfill | Seller uses Concretar/confirm-sale and confirms. | Conversation becomes `SELLER_ACCEPTED` once; both actors see the correct next action/deadline and agreed offer. | PASS | Founder retest: complete and working, including the revised shipping/pickup next-step presentation. | |
| [x] | VITAL-26 | P0 | Seller marks shipment sent | Seller uses the visible shipped/finalize action for the shipping order. | No pickup code is requested; state becomes `SENT_SHIPMENT`; buyer gets receipt confirmation action. | PASS | | |
| [x] | VITAL-27 | P0 | Buyer completes shipping | Buyer confirms the product was received. | State becomes `FINALIZED`; transaction actions close; request and offer show the completed result. | PASS | The transaction completed when the buyer confirmed receipt. | |
| [x] | VITAL-28 | P0 | Ratings work both ways | Buyer rates seller, then seller rates buyer. Refresh summaries and try to rate again. | Each direction saves once; correct summaries update; each actor's rating action disappears after use. | PASS | Rating behavior and revised tags are complete and working. UX follow-up shared with VITAL-29: finalized activity should live in Profile history, not active Home/Offers. | BUG-016 |
| [x] | VITAL-29 | P0 | Completed state persists | Force-close both apps and reopen Home, Offers, Chats, request detail, and conversation. | Every screen agrees the transaction is finalized; no state rolls back, duplicates, or disappears. | PASS | Persistence is complete and working. Product organization change requested: remove the seller Ofertas/Historial switch, keep all finalized rows off main surfaces, and expose a filterable/sortable **Solicitudes finalizadas** screen from Profile. | BUG-016 |
| [x] | VITAL-30 | P0 | Pickup can be selected | Publish a second clearly named request. Seller creates a pickup-capable offer; buyer accepts Pickup. | A separate transaction exists; Pickup is selected and the buyer's verified email is recognized. | PASS | | |
| [x] | VITAL-31 | P0 | Pickup commitment is distinct | Seller taps Concretar on the pickup order; buyer inspects the conversation. | State becomes `SELLER_ACCEPTED`; pickup-specific copy appears; no shipping action/code is incorrectly used yet. | PASS | Founder retest: complete and working. | |
| [x] | VITAL-32 | P0 | Buyer can generate pickup code | At pickup time buyer chooses Generate pickup code and checks the verified inbox. | One purpose-specific 4-digit code is emailed to the buyer, expires as configured, and is never shown to seller. | PASS | Founder retest: complete and working. | |
| [x] | VITAL-33 | P0 | Pickup code completes safely | Seller starts Finalize, enters one wrong code, then the current buyer-provided code, then attempts reuse. | Wrong code does not complete; correct code finalizes once; reuse causes no duplicate history or notification. | PASS | | |
| [x] | VITAL-34 | P1 | Account/profile editing works | Edit an allowed name and profile image; inspect phone; reopen under both roles. | Allowed fields persist; phone remains read-only login identity; changes are scoped to the intended profile/business. | PASS | | |
| [x] | VITAL-35 | P0 | One profile can be deleted safely | Using the disposable dual-profile fixture, delete the secondary profile with fresh reauth; reopen the switcher and sign in again. | One profile disappears; remaining profile and Auth account stay usable; active profile falls back correctly. | PASS | Founder retest: complete and working, including the immediate remaining-profile navigation. | |
| [x] | VITAL-36 | P0 | Full account deletion enters the real workflow | At the very end request deletion of the disposable account, enter fresh reauth, save the receipt/reference, and retry sign-in. | One request is created; local session clears; duplicate request is avoided; pending-deletion login is safely rejected. | PASS | | |
| [x] | VITAL-37 | P0 | Deletion preserves only allowed history | After deletion processing, surviving counterpart reopens the completed conversation. | Required history remains readable with a sanitized/tombstoned participant; deleted private identity data is absent. | PASS | | |

Section result: **TESTED — 18 PASS / 1 FAIL**<br>
Observations: Counterpart profiles, base messaging/realtime, fulfillment, ratings, persistence, and profile deletion passed. The remaining failed row is the newly reproduced text-plus-three-images ordering regression associated with VITAL-23; the notification screen redesign and completed-history reorganization are implemented and await visual/manual retest.<br>
Open bugs/blockers: BUG-012, BUG-016, and BUG-020 are implemented and awaiting focused manual retest. BUG-013 still needs an explicit recipient-outside-chat notification retest because the latest VITAL-23 evidence concerns grouped message ordering rather than notification creation.<br>
Tester/sign-off/date:

## Phase 1B — Vital accounts, profiles, screens, and visible queries

These focused checks fill gaps not convenient to prove inside the guided journey. They test product behavior through the app; deeper SQL/RLS/performance checks belong to Phase 2.

| Done  | ID           | P   | What this proves                       | How to test                                                                                                                                | Expected result                                                                                                     | Result  | Evidence / observations                                                                                                              | Bug ID |
| ----- | ------------ | --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| [ x ] | CORE-AUTH-01 | P0  | Auth safely rejects and recovers       | Try signup with a registered phone, login with an unknown phone, wrong/expired OTP, then Resend and use the new valid OTP.                 | Invalid attempts create no session/profile; resend recovers without duplicates or revealing another account.        |         |                                                                                                                                      |        |
| [ x ] | CORE-AUTH-02 | P0  | Interrupted onboarding resumes         | Force-close during identity review, email verification, and seller business review; reopen/sign in each time.                              | The authoritative pending step resumes; no duplicate profile, business, or submission appears.                      |         |                                                                                                                                      |        |
| [ ]   | CORE-AUTH-03 | P0  | New legal version gates correctly      | Activate a newer test legal version; launch, try continue unchecked, open both docs, accept, and relaunch.                                 | Only allowed legal/sign-out actions work until acceptance; accepted version persists once.                          |         |                                                                                                                                      |        |
| [ x ] | CORE-AUTH-04 | P0  | Sign-out works everywhere              | Test Profile quick sign-out and Settings sign-out, including Cancel wherever offered; press Back/deep-link/relaunch after confirmation.    | Cancel preserves session; confirmation clears private/profile state and returns to welcome; next login works.       |         |                                                                                                                                      |        |
| [ x ] | CORE-PROF-01 | P0  | Same login can own both roles          | From a verified buyer add a seller profile and finish setup; try to add another buyer and double-tap/retry creation.                       | One buyer plus one seller exists; duplicate buyer/profile is denied; auth session remains the same.                 |         |                                                                                                                                      |        |
| [ x ] | CORE-PROF-02 | P0  | Business invitation works              | Owner invites a test phone; recipient chooses seller invitation path and accepts.                                                          | Recipient joins the exact business once as member, not owner; invitation is single-use.                             | correct | visually when the admin seller checks the "cancelar invitacion" popup the cancelar button text is too big "leave it just as canelar" |        |
| [ x ] | CORE-PROF-03 | P0  | Profile selection restores safely      | Select seller, force-close/reopen. With a safe fixture, remove that selected profile and reopen.                                           | Valid selection restores; missing/unowned saved ID falls back to an owned default without blank screen or loop.     | correct |                                                                                                                                      |        |
| [ x ] | CORE-NAV-01  | P0  | Navigation matches role/config         | Compare buyer and seller bottom tabs with target DB configuration; tap every item.                                                         | Correct label, icon, order, visibility, and destination appear for each role; no other-role tab leaks.              | correct |                                                                                                                                      |        |
| [ x ] | CORE-BIZ-01  | P0  | Business owner edits persist           | As owner edit commercial name, CR province→canton→district, and categories; save, reopen, and load seller home.                            | Values persist; only the district choice is stored; categories immediately control setup/discovery.                 | correct |                                                                                                                                      |        |
| [ x ] | CORE-BIZ-02  | P0  | Members cannot act as owners           | As invited member open business name/location/categories/team, including direct links if available.                                        | Intended data is visible, but owner-only mutation, invite, and removal actions are unavailable/denied.              | correct |                                                                                                                                      |        |
| [ ]   | CORE-QRY-01  | P0  | Buyer home shows database truth        | Prepare known active, accepted, and canceled buyer requests; load/refresh and compare titles, statuses, views, offers, groups, and counts. | All values match the known records and DB labels/styles; no seller/unowned record appears.                          |         |                                                                                                                                      |        |
| [ ]   | CORE-QRY-02  | P0  | Seller home shows eligible demand      | Give seller known categories and prepare matching/nonmatching requests; load/refresh seller home.                                          | Only eligible opportunities appear with correct grouping, interaction state, counts, and order.                     |         |                                                                                                                                      |        |
| [ ]   | CORE-QRY-03  | P0  | Filters actually change the query      | For both roles use a segment and one text/date/status/category filter, then Clear; note known matching request IDs.                        | Rows narrow to the selected criteria; `todas`/Clear restores eligible data; stale earlier results do not overwrite. |         |                                                                                                                                      |        |
| [ ]   | CORE-QRY-04  | P0  | Full lists paginate without corruption | Prepare more than 20 eligible records; open View all, load the next page, and refresh.                                                     | Stable order and 20/page behavior; no missing/duplicate IDs; current criteria remain correct.                       |         |                                                                                                                                      |        |
| [ ]   | CORE-QRY-05  | P0  | Favorites persist and isolate          | Favorite from card/detail, relaunch, switch role/profile, favorite separately, then switch back and remove.                                | All surfaces synchronize; favorites remain unique and isolated by active profile/role.                              |         |                                                                                                                                      |        |
| [ ]   | CORE-QRY-06  | P0  | Offers and chats use active profile    | Prepare known offers/chats/unread rows, open both lists, then switch profiles.                                                             | Only active-profile rows appear; destinations, counterpart/request titles, previews, and unread order are correct.  |         |                                                                                                                                      |        |
| [ ]   | CORE-QRY-07  | P1  | Empty/error/retry are honest           | Use an empty fixture, then disable network while opening Home/Favorites/Offers/Chats; reconnect and retry.                                 | Empty differs from error; no endless spinner/false zero; retry loads only current-profile data.                     |         |                                                                                                                                      |        |
| [ ]   | CORE-DEL-01  | P0  | Unsafe profile deletion is blocked     | On a one-profile account choose Delete profile; also try owner profile with dependent members.                                             | App explains why deletion is blocked and directs to the allowed account/ownership path; no orphan is created.       |         |                                                                                                                                      |        |

Section result: **NOT TESTED**<br>
Observations:<br>
Open bugs/blockers:<br>
Tester/sign-off/date:

## Phase 1B — Vital conversation and request-state behavior

Use separate spare requests so one test does not destroy the setup for another. For deadline rows, use prepared past-due fixtures rather than waiting days.

| Done | ID       | P   | What this proves                          | How to test                                                                                                                  | Expected result                                                                                                                  | Result | Evidence / observations | Bug ID |
| ---- | -------- | --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- | ------ |
| [ ]  | STATE-01 | P0  | Buyer can reject an offer                 | Create a spare offered request; buyer chooses Reject and confirms.                                                           | Conversation becomes `OFFER_REJECTED`; seller sees it; request remains open to other sellers.                                    |        |                         |        |
| [ ]  | STATE-02 | P0  | Seller can withdraw an offer              | On another `OFFER_MADE` conversation seller chooses Cancel/withdraw offer.                                                   | Offer is no longer selectable; conversation returns to `REQUEST_OPENED`; buyer is updated once.                                  |        |                         |        |
| [ ]  | STATE-03 | P0  | Seller can discard an opportunity         | Open a fresh request as seller and choose Discard before offering.                                                           | It becomes `REQUEST_DISCARDED` only for that seller; buyer request remains active.                                               |        |                         |        |
| [ ]  | STATE-04 | P0  | Buyer can cancel a whole request          | Publish a spare request with open seller chats/offers; choose Cancel request and confirm.                                    | Request becomes canceled; related conversations become `REQUEST_CANCELED`; sellers cannot continue.                              |        |                         |        |
| [ ]  | STATE-05 | P0  | Only one seller can win                   | Have Seller A and Seller B offer on one request; buyer accepts Seller A.                                                     | A becomes `OFFER_ACCEPTED`; sibling offer closes as rejected and unopened sibling as discarded; second acceptance is impossible. |        |                         |        |
| [ ]  | STATE-06 | P0  | Cancellation boundary is enforced         | Cancel one accepted purchase before Concretar; try again on another after Concretar.                                         | Pre-commit cancellation succeeds once; post-commit request cancellation is unavailable/blocked without changing state.           |        |                         |        |
| [ ]  | STATE-07 | P0  | Seller can recover after acceptance delay | Open a prepared past-due seller-commitment fixture and inspect actions; seller then continues if allowed.                    | `DELAYED_ACCEPTANCE` appears once with correct copy/actions; permitted recovery proceeds to shipping.                            |        |                         |        |
| [ ]  | STATE-08 | P0  | Buyer controls delayed shipment outcome   | Open a prepared past-due shipment; exercise Received and, on another fixture, Not received.                                  | `DELAYED_SHIPMENT` appears once; only permitted actor/actions show; each configured response finalizes correctly.                |        |                         |        |
| [ ]  | STATE-09 | P0  | Safety controls affect behavior           | Report, block, try discovery/chat, then unblock from Blocked accounts.                                                       | Report stays private; block suppresses prohibited contact/discovery; only owner unblocks; history remains.                       |        |                         |        |
| [ ]  | STATE-10 | P0  | Codes are purpose-bound and one-use       | With safe fixtures try expired/reused/cross-purpose login, email, pickup, and deletion codes; then use a fresh correct code. | Bad codes never authorize or mutate; fresh correct code works once; recovery copy reveals no secret/account detail.              |        |                         |        |
| [ ]  | STATE-11 | P0  | Terminal conversations remain safe        | Reopen finalized, rejected, discarded, canceled, and participant-deleted conversations.                                      | Allowed history stays readable; normal messages/fulfillment are disabled; only valid safety/rating actions remain.               |        |                         |        |
| [ ]  | STATE-12 | P1  | Lists reflect every lifecycle result      | After the state tests, search/filter/sort Home, Offers, and Chats and clear each control.                                    | Rows, counts, stages, status copy, and order match the final states; buyer/seller data never mixes.                              |        |                         |        |

### Messaging permission oracle

Use this as the expected product behavior when inspecting the composer.

| Conversation status                                                                           | Buyer messaging | Seller messaging |
| --------------------------------------------------------------------------------------------- | --------------- | ---------------- |
| `REQUEST_OPENED`                                                                              | No              | No               |
| `OFFER_MADE`                                                                                  | Text and images | Text and images  |
| `OFFER_ACCEPTED`                                                                              | No              | No               |
| `SELLER_ACCEPTED`                                                                             | No              | No               |
| `SENT_SHIPMENT`                                                                               | Text and images | Text and images  |
| `DELAYED_ACCEPTANCE`                                                                          | Text and images | Text and images  |
| `DELAYED_SHIPMENT`                                                                            | Text and images | No               |
| `OFFER_REJECTED`, `FINALIZED`, `REQUEST_CANCELED`, `REQUEST_DISCARDED`, `PARTICIPANT_DELETED` | No              | No               |

Section result: **NOT TESTED**<br>
Observations:<br>
Open bugs/blockers:<br>
Tester/sign-off/date:

## Phase 1 sign-off gate — stop here until it passes

- [ ] Every Phase 1 P0 is `PASS` with evidence.
- [ ] Phase 1A was run in order without manual database repair, except explicitly prepared deadline fixtures.
- [ ] One complete shipping journey reached `FINALIZED` and both actors rated.
- [ ] One complete pickup journey reached `FINALIZED` using the buyer-generated code.
- [ ] Account creation, sign-in, sign-out, session restore, profile switching, profile deletion, and account-deletion request work.
- [ ] Buyer request AI and seller offer AI preserve intent and create exactly one final record each.
- [ ] Buyer/seller homes, primary screens, details, lists, filters, favorites, chats, and visible counts show correct active-profile data.
- [ ] All vital conversation states/actions/permissions behave as documented.
- [ ] No open Blocker, Critical, or Major bug affects vital product behavior.

| Field                            | Entry                                                            |
| -------------------------------- | ---------------------------------------------------------------- |
| Phase 1 decision                 | NOT TESTED / FAIL — RETURN TO FIXES / PASS — CONTINUE TO PHASE 2 |
| Failed/blocked test IDs          |                                                                  |
| Open vital bugs                  |                                                                  |
| Shipping evidence                |                                                                  |
| Pickup evidence                  |                                                                  |
| Buyer account evidence           |                                                                  |
| Seller account/business evidence |                                                                  |
| Product owner/date               |                                                                  |
| Tester/date                      |                                                                  |

### Phase 1 code-audit watchpoints

These are behaviors to watch closely, not automatic failures until the test proves them.

| Watchpoint                                                                      | Test IDs                         | What to observe                                                                                                                            |
| ------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Signup legal acceptance may not persist on the normal buyer/seller signup path. | VITAL-02, VITAL-06, CORE-AUTH-03 | A user who accepted the current version during signup should not be asked to accept that same version again.                               |
| Sign-out presentation differs between Profile and Settings.                     | VITAL-05, CORE-AUTH-04           | Record whether the missing/extra confirmation is intentional; both paths must clear the same private state.                                |
| Profile deletion entry appears role-dependent.                                  | VITAL-35, CORE-DEL-01            | A dual-profile user must have an intentional way to delete any eligible profile, or the product rule must be documented.                   |
| Buyer request attachment intent needs confirmation.                             | VITAL-11, VITAL-12               | Current app contract says text-only; if an attachment control appears, record whether it is functional and intended before classifying it. |

# PHASE 2 — RELEASE HARDENING AND EXTENDED REGRESSION

Begin here only after the Phase 1 decision is `PASS — CONTINUE TO PHASE 2`. The remaining sections add edge cases, security/privacy boundaries, deployment parity, provider faults, concurrency, resilience, accessibility, operations, and final release evidence. They intentionally repeat parts of Phase 1 at deeper technical depth.

## 3. Preparation baseline observed while this tracker was prepared

These are preparation-time observations, updated with the Push Notifications V1 closeout verification on 2026-08-22. They are not substitutes for full release-candidate testing.

| ID      | Observation on 2026-08-18                                                                                                      | Current state        | Release action                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------- |
| BASE-01 | `npm run test:unit` executed successfully: 30/30 passed on 2026-08-22.                                                         | PASS now             | Confirm the same result in CI on the release commit.                                                     |
| BASE-02 | `npm run lint` executed successfully.                                                                                          | PASS now             | Re-run on the exact release commit and attach output.                                                    |
| BASE-03 | `npx tsc --noEmit` executed successfully.                                                                                      | PASS now             | Re-run on the exact release commit and attach output.                                                    |
| BASE-04 | Live Supabase project is `ACTIVE_HEALTHY`, Postgres 17.6.1.025.                                                                | Observed             | Confirm again immediately before sign-off.                                                               |
| BASE-05 | Local and linked migration histories match through `20260822022357_add_critical_push_notifications`; dry-run and schema diff are empty. | PASS now          | Confirm the same result in CI on the release commit.                                                     |
| BASE-06 | Local inventory and production both include active `process-push-notifications`; production lists all 17 tracked functions active. | PASS now           | Complete physical-device delivery tests for each target platform.                                       |
| BASE-07 | Linked runtime verification confirms all 8 required cron jobs, including `process-push-notifications`.                         | PASS now             | Monitor the production worker and Expo receipts.                                                         |
| BASE-08 | All 8 declared Storage buckets exist live with expected public/private flags and size/MIME restrictions.                       | Observed             | Re-run runtime verification for release evidence.                                                        |
| BASE-09 | Clean local DB reset, bucket reconciliation, and all 1,107 pgTAP assertions passed on 2026-08-22.                              | PASS now             | Confirm the same result in CI on the release commit.                                                     |
| BASE-10 | Full Deno suite passed 168/168 and every tracked Edge Function entrypoint type-checked on 2026-08-22.                        | PASS now             | Confirm the same result in CI on the release commit.                                                     |
| BASE-11 | `supabase/seed.sql` and DB README disagree on seed row/table totals.                                                           | OPEN DOC DRIFT       | Reconcile before using seed totals as acceptance evidence.                                               |
| BASE-12 | DB test README references a Node function suite that is absent from the DB repo.                                               | OPEN COVERAGE GAP    | Locate/restore it or document equivalent Edge integration coverage.                                      |
| BASE-13 | Account-deletion runbook says no application-operated DB/Storage backup exists on the current Free plan.                       | OPEN RISK            | Complete restore drill or obtain explicit risk acceptance.                                               |
| BASE-14 | Deletion completion email and deletion support-alert delivery are documented as disabled/unimplemented.                        | OPEN RISK            | Implement/test or obtain explicit scope acceptance.                                                      |
| BASE-15 | AI P0 gate still lists creation of a separate staging project and staging regressions as pending.                              | OPEN GATE            | Complete with staging evidence.                                                                          |
| BASE-16 | Buyer request-assistant contract is text-only, while the current layout appears to allow attachments.                          | VERIFY LIKELY DEFECT | Run `REQ-04`; fix or approve intended scope.                                                             |
| BASE-17 | Seller full-list filtering may omit the DB-supported `discarded` state.                                                        | VERIFY CONCERN       | Run `HOME-10`; fix or approve intended UX.                                                               |
| BASE-18 | Live Supabase advisors show informational no-policy notices on private-schema tables.                                          | REVIEW               | Confirm these tables are service-only/non-exposed and record security approval.                          |

## 4. Phase 2 extended actors and fixtures

Never store passwords, access tokens, OTPs, raw identity documents, or production PII in this file.

| Fixture | Required state                                                                                           | Account / data reference | Ready? | Notes                                                          |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------------------ | ------ | -------------------------------------------------------------- |
| U0      | Signed-out new Costa Rica phone                                                                          |                          | [ ]    |                                                                |
| U1      | Buyer, Didit verified, legal accepted, verified opted-in email                                           |                          | [ ]    |                                                                |
| U2      | Approved seller business owner, categories and location configured                                       |                          | [ ]    |                                                                |
| U3      | Member of U2 business                                                                                    |                          | [ ]    |                                                                |
| U4      | One auth user with buyer and seller profiles; unread notifications on each                               |                          | [ ]    |                                                                |
| U5      | Restricted seller with variants `PENDING`, `NEEDS_ACTION`, `REJECTED`, `APPROVED`                        |                          | [ ]    |                                                                |
| U6      | Identity variants `NOT_STARTED`, `IN_PROGRESS`, `IN_REVIEW`, `ACTION_REQUIRED`, `INELIGIBLE`, `VERIFIED` |                          | [ ]    |                                                                |
| U7      | Unrelated buyer/seller outsider for BOLA/IDOR tests                                                      |                          | [ ]    |                                                                |
| U8      | Legacy buyer created before identity-verification cutoff                                                 |                          | [ ]    |                                                                |
| U9      | Business reviewer/admin and service-worker test identities                                               |                          | [ ]    |                                                                |
| DATA-01 | At least 2 leaf categories, requirements, and 1 segment                                                  |                          | [ ]    | Categories/segments are not seeded.                            |
| DATA-02 | Requests in active, offer accepted, canceled, participant-deleted states                                 |                          | [ ]    | Include 0/1/many offers, favorites, views.                     |
| DATA-03 | Shipping-only, pickup-only, both-method, and invalid no-method offers                                    |                          | [ ]    | Include CRC and USD.                                           |
| DATA-04 | Conversations in every DB status for both roles                                                          |                          | [ ]    | Include deadlines, unread, rated/unrated, blocked/reported.    |
| DATA-05 | Notification types `urgent`, `action_needed`, `information`                                              |                          | [ ]    | Include cross-profile push destinations.                       |
| DATA-06 | Valid and invalid media at exact and over limits                                                         |                          | [ ]    | Include MIME/extension/byte spoofing.                          |
| DATA-07 | Didit sandbox identities and Resend/test email destinations                                              |                          | [ ]    | Do not use real identity documents.                            |
| DATA-08 | Objects in all 8 Storage buckets                                                                         |                          | [ ]    | Include current, superseded, orphaned, and unauthorized paths. |
| DATA-09 | Active Terms and Privacy 1.1 plus a test superseding version                                             |                          | [ ]    |                                                                |
| DATA-10 | Expo push tokens on physical iOS and Android devices                                                     |                          | [ ]    |                                                                |

## 5. Preflight, build, and runtime acceptance

Sources: `package.json`, `app.json`, `eas.json`, `../luppit-supabase/README.md`, `scripts/verify-runtime.sql`, `ai-edge-functions/docs/p0-production-gate.md`, live Supabase metadata.

| Done | ID     | P   | Test / steps                                                                                             | Expected result                                                                                                          | Result | Evidence | Observations / Bug ID |
| ---- | ------ | --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------ | -------- | --------------------- |
| [ ]  | PRE-01 | P0  | Record exact app, DB, and Edge commit SHAs; confirm working trees and release branch.                    | Reviewed commits are clean, reproducible, and match the release build/deployment.                                        |        |          |                       |
| [ ]  | PRE-02 | P0  | Run `npm run test:unit`.                                                                                 | All tests pass; count and output are attached.                                                                           |        |          |                       |
| [ ]  | PRE-03 | P0  | Run `npm run lint`.                                                                                      | Exit 0 with no unresolved release warning/error.                                                                         |        |          |                       |
| [ ]  | PRE-04 | P0  | Run `npx tsc --noEmit`.                                                                                  | Exit 0.                                                                                                                  |        |          |                       |
| [ ]  | PRE-05 | P0  | Rebuild local DB from empty state, seed buckets, and run all pgTAP tests.                                | 53 migrations apply; all 1,107+ current assertions pass; runtime verification passes.                                    |        |          |                       |
| [ ]  | PRE-06 | P0  | Run current full Deno unit/check suite in `ai-edge-functions`.                                           | All current tests and function type checks pass from clean checkout.                                                     |        |          |                       |
| [ ]  | PRE-07 | P0  | Compare local DB migrations to the target Supabase migration list.                                       | Exact parity; no unapplied, remote-only, duplicate, or unexplained history entry.                                        |        |          |                       |
| [ ]  | PRE-08 | P0  | Compare local Edge Function directories/config to live inventory and versions.                           | Exact intended inventory; JWT verification setting is reviewed for every public/worker/webhook function.                 |        |          |                       |
| [ ]  | PRE-09 | P0  | Run linked runtime verification.                                                                         | Exactly 8 intended cron jobs and 8 intended buckets; schedules, URLs, secrets, limits, MIME types, and visibility match. |        |          |                       |
| [ ]  | PRE-10 | P0  | Verify categories, category requirements, and segments in staging/target.                                | Required marketplace reference data exists, is active, ordered, and usable by both roles.                                |        |          |                       |
| [ ]  | PRE-11 | P0  | Check required app/Edge/Vault secrets by name without printing values.                                   | All required secrets exist in the correct environment and are not exposed to clients/logs.                               |        |          |                       |
| [ ]  | PRE-12 | P0  | Build/install release binaries on physical iOS and Android devices.                                      | Cold launch succeeds without dev server; version/build/env identify the intended release.                                |        |          |                       |
| [ ]  | PRE-13 | P0  | Verify Sentry environment/release and trigger a safe test event.                                         | Event arrives in correct environment/release with no secrets or PII.                                                     |        |          |                       |
| [ ]  | PRE-14 | P0  | Review live Supabase security/performance advisors.                                                      | Every notice is fixed or has dated, accountable acceptance; private service-only tables remain non-exposed.              |        |          |                       |
| [ ]  | PRE-15 | P0  | Reconcile seed row/table documentation and function-test location.                                       | Documentation matches executable state; no missing claimed test suite.                                                   |        |          |                       |
| [ ]  | PRE-16 | P0  | Verify separate staging environment and test accounts.                                                   | Staging is isolated from production users/data/secrets; no shared development credential remains.                        |        |          |                       |
| [ ]  | PRE-17 | P0  | Confirm administrative MFA and least-privilege access for Supabase, GitHub, mail, Didit, and monitoring. | Required admins use MFA; former/shared access is removed.                                                                |        |          |                       |

Section result: **NOT TESTED**<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 6. Bootstrap, routing, gates, and authentication

Sources: `app/_layout.tsx`, `app/index.tsx`, `app/(auth)/*`, `app/request/[purchaseRequestId].tsx`, `ActiveProfileContext`, `LegalAcceptanceGate`, `EmailSetupNavigationGate`, identity services.

| Done | ID      | P   | Test / steps                                                                                                                      | Expected result                                                                                 | Result | Evidence | Observations / Bug ID |
| ---- | ------- | --- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ | -------- | --------------------- |
| [ ]  | BOOT-01 | P0  | Cold launch while signed out; attempt protected deep links.                                                                       | Auth welcome appears; protected content never flashes.                                          |        |          |                       |
| [ ]  | BOOT-02 | P0  | Launch/relaunch a fully ready profile and visit `/` plus auth routes.                                                             | Resolves once to role home; no loop or auth-screen flash.                                       |        |          |                       |
| [ ]  | BOOT-03 | P0  | Launch users with no profile, incomplete identity, incomplete business verification, missing email, or missing seller categories. | Each user is routed to the correct gate; only intended allowlisted routes remain usable.        |        |          |                       |
| [ ]  | BOOT-04 | P0  | Publish a new required legal version, launch, open documents, decline/accept.                                                     | App remains gated until explicit acceptance; sign-out works; acceptance unlocks once.           |        |          |                       |
| [ ]  | BOOT-05 | P0  | Expire/revoke session during use and relaunch.                                                                                    | Profile state and private UI clear; user returns to auth without stale data.                    |        |          |                       |
| [ ]  | BOOT-06 | P0  | Open request link signed out, authenticate, then repeat as buyer and seller.                                                      | Pending link resolves exactly once; buyer opens detail; seller creates/reuses one conversation. |        |          |                       |
| [ ]  | BOOT-07 | P1  | Open unknown/missing/inaccessible route and use back with no stack history.                                                       | Safe not-found/fallback and deterministic route back; no loop/crash.                            |        |          |                       |
| [ ]  | BOOT-08 | P1  | Background/foreground during verification/profile refresh.                                                                        | State refreshes without duplicate navigation or stale gate.                                     |        |          |                       |
| [ ]  | AUTH-01 | P0  | Open Terms/Privacy from welcome/signup, then return.                                                                              | Current DB documents open; entered phone and selected role remain.                              |        |          |                       |
| [ ]  | AUTH-02 | P0  | Submit blank, short, long, malformed, and valid Costa Rica phone.                                                                 | Invalid values are blocked; valid 8-digit phone requests one OTP.                               |        |          |                       |
| [ ]  | AUTH-03 | P0  | Enter wrong, expired, and reused login OTP; test resend and throttling.                                                           | Safe localized errors; no session on failure; resend/rate-limit recovery works.                 |        |          |                       |
| [ ]  | AUTH-04 | P0  | Sign in buyer, seller, dual-profile, and pending-deletion users.                                                                  | Correct onboarding/profile resumes; pending-deletion login fails safely.                        |        |          |                       |
| [ ]  | AUTH-05 | P0  | Signup as buyer and seller; change tabs; open legal links; submit without acceptance.                                             | Chosen role persists and acceptance is mandatory.                                               |        |          |                       |
| [ ]  | AUTH-06 | P0  | Complete successful buyer and seller signup.                                                                                      | Starts exact role-specific onboarding and verification route once.                              |        |          |                       |
| [ ]  | AUTH-07 | P0  | Start Didit without consent, then grant consent.                                                                                  | Start disabled until consent; sandbox opens in Spanish and binds to correct user.               |        |          |                       |
| [ ]  | AUTH-08 | P0  | Deny permissions, cancel SDK, go offline, and simulate SDK failure.                                                               | Recoverable state and safe copy; no false verification.                                         |        |          |                       |
| [ ]  | AUTH-09 | P0  | Exercise identity states `IN_PROGRESS`, `IN_REVIEW`, `ACTION_REQUIRED`, `INELIGIBLE`, `VERIFIED`.                                 | Distinct correct copy/actions; return/poll refreshes state.                                     |        |          |                       |
| [ ]  | AUTH-10 | P0  | Replay/delay successful identity callback and relaunch.                                                                           | Profile activates once; no duplicate buyer/profile and no Didit restart.                        |        |          |                       |
| [ ]  | AUTH-11 | P0  | Existing buyer tries another buyer profile; seller-only verified user activates buyer.                                            | Duplicate buyer is denied; seller-only path creates exactly one buyer.                          |        |          |                       |

Section result: **NOT TESTED**<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 7. Active profiles, navigation, and setup isolation

Sources: `src/components/profile/ActiveProfileContext.tsx`, `src/services/active.profile.service.ts`, `src/components/navbar/*`, `navbar.service.ts`, `segment.service.ts`, `app/(detail)/create-profile.tsx`.

| Done | ID      | P   | Test / steps                                                                   | Expected result                                                                                             | Result | Evidence | Observations / Bug ID |
| ---- | ------- | --- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------ | -------- | --------------------- |
| [ ]  | PROF-01 | P0  | Open profile switcher as U4.                                                   | Only owned profiles appear with correct role/business, image, unread count, default, and one active marker. |        |          |                       |
| [ ]  | PROF-02 | P0  | Switch buyer→seller→buyer and press active profile.                            | Active press is inert; switch preserves auth, routes home, remounts role UI, and reloads data.              |        |          |                       |
| [ ]  | PROF-03 | P0  | Switch while home, AI, chat, notification, and filters are loading.            | Stale work is ignored/aborted; no prior-profile data, unread counts, or navigation leaks.                   |        |          |                       |
| [ ]  | PROF-04 | P0  | Persist a valid then invalid active profile ID and relaunch.                   | Valid owned profile restores; invalid/unowned ID falls back to DB default/first owned profile.              |        |          |                       |
| [ ]  | PROF-05 | P0  | Create buyer/seller profiles through allowed paths; retry after response loss. | Validation is correct and retry never creates duplicates.                                                   |        |          |                       |
| [ ]  | PROF-06 | P0  | Accept valid, expired, revoked, and already-used business invitation.          | Only valid invitation joins exact business once; other cases fail safely.                                   |        |          |                       |
| [ ]  | PROF-07 | P1  | Decline invitation, cancel decline, load empty/error states.                   | Confirm removes; cancel preserves; retry/empty states are accurate.                                         |        |          |                       |
| [ ]  | NAV-01  | P0  | Compare buyer/seller bottom tabs with `get_navbar_items_by_profile`.           | Label, route, icon, order, and visibility exactly match DB config; no hardcoded fallback.                   |        |          |                       |
| [ ]  | NAV-02  | P0  | Test setup-gated tabs, active tab re-press, and profile tab.                   | Gated tabs are disabled/redirected accessibly; active tab is inert; profile retains bottom nav.             |        |          |                       |
| [ ]  | NAV-03  | P1  | Inject unknown/missing DB icon.                                                | Item/segment falls back or omits safely without breaking navigation.                                        |        |          |                       |
| [ ]  | NAV-04  | P0  | Compare segment chips to live DB; select each and disabled variant.            | DB name/order/icon/disabled state match; `todas` sends no narrowing; selection reloads correct role RPC.    |        |          |                       |
| [ ]  | NAV-05  | P1  | Verify profile unread dot/count at 0, 1, and >99.                              | Dot only when nonzero; accessibility label includes correct/capped count.                                   |        |          |                       |
| [ ]  | NAV-06  | P1  | Open the large search control on home/list surfaces.                           | Opens the intended filter UI; does not act as an unbacked client search field.                              |        |          |                       |

Section result: **NOT TESTED**<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 8. Buyer/seller home, discovery, lists, and favorites

Sources: `app/(tabs)/index.tsx`, `favorites.tsx`, `offers.tsx`, `chats.tsx`, `app/(detail)/marketplace-hub-section.tsx`, marketplace/filter services, `src/components/marketplaceHub/*`.

| Done | ID      | P   | Test / steps                                                                      | Expected result                                                                                            | Result | Evidence | Observations / Bug ID |
| ---- | ------- | --- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ | -------- | --------------------- |
| [ ]  | HOME-01 | P0  | Load buyer and seller homes with fixture data.                                    | Correct role RPC drives overview, stages, rails, names, counts, limits, reasons, priorities, and actions.  |        |          |                       |
| [ ]  | HOME-02 | P0  | Compare cards to DB response.                                                     | Buyer status/style/views/offers and seller interaction state match RPC exactly; client does not recompute. |        |          |                       |
| [ ]  | HOME-03 | P0  | Open same request repeatedly as buyer and seller.                                 | Buyer opens detail; seller creates/reuses one conversation and one visualization/summary effect.           |        |          |                       |
| [ ]  | HOME-04 | P0  | Select every stage; remove currently selected stage from response.                | Rail/count updates; missing stage falls back to role default without crash.                                |        |          |                       |
| [ ]  | HOME-05 | P1  | Use attention/unread shortcuts and `Ver todas`.                                   | Destination and counts match DB; stage/segment/filter/sort context is retained.                            |        |          |                       |
| [ ]  | HOME-06 | P0  | Buyer filters: text/date/status; seller: text/date/category/new/opened/discarded. | Combined server results, chip counts, removal, and reset are correct.                                      |        |          |                       |
| [ ]  | HOME-07 | P0  | Test canceled buyer status with incompatible stage.                               | UI chooses compatible DB-defined stage and returns correct records.                                        |        |          |                       |
| [ ]  | HOME-08 | P0  | Test every DB-returned sort and clear.                                            | Sort order matches DB; clearing restores DB default.                                                       |        |          |                       |
| [ ]  | HOME-09 | P0  | Paginate >40 records; refresh/load-more fail and retry.                           | 20/page, stable order, no duplicate IDs, existing items retained, retry works.                             |        |          |                       |
| [ ]  | HOME-10 | P0  | Open seller full list and select `discarded`.                                     | `discarded` remains available/functional if returned by DB; no client normalization silently removes it.   |        |          |                       |
| [ ]  | HOME-11 | P0  | Change filter/sort rapidly under slow/out-of-order responses.                     | Page/scroll reset; newest criteria wins and stale response cannot overwrite.                               |        |          |                       |
| [ ]  | HOME-12 | P1  | Compare no-data, filtered-empty, setup-gated, loading, and error states.          | Each state is distinct; setup gate does not call home RPC; retry is bounded.                               |        |          |                       |
| [ ]  | HOME-13 | P0  | Favorite/unfavorite from card, detail, favorites list, buyer, and seller roles.   | Profile+role isolation and uniqueness hold; every surface synchronizes.                                    |        |          |                       |
| [ ]  | HOME-14 | P1  | Preview/save/cancel home presets.                                                 | DB order/name/max items render; cancel is no-op; save affects only selected profile/surface.               |        |          |                       |
| [ ]  | LIST-01 | P1  | Load seller offers as seller and buyer; test loading/error/empty.                 | Only current seller data appears; buyer sees intended alternate/empty state.                               |        |          |                       |
| [ ]  | LIST-02 | P0  | Filter seller offers by search/date/status/category/currency and sort CRC/USD.    | RPC results and chip counts match; currencies are never numerically mixed.                                 |        |          |                       |
| [ ]  | LIST-03 | P1  | Open offer with and without associated conversation.                              | Existing conversation opens; missing association fails safely.                                             |        |          |                       |
| [ ]  | LIST-04 | P1  | Test favorites search/date/category/status/sorts for both roles.                  | Results, order, and role isolation match DB; removal updates all surfaces.                                 |        |          |                       |
| [ ]  | LIST-05 | P0  | Test chats search/date/category, unread/opened order, and realtime preview.       | No unsupported filter; unopened first then `last_message_at desc`; unread/preview/time update.             |        |          |                       |
| [ ]  | LIST-06 | P1  | Compare chat row and route titles.                                                | Row shows counterpart; conversation header shows request title.                                            |        |          |                       |

Section result: **NOT TESTED**<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 9. Buyer request assistant and purchase-request lifecycle

Sources: `app/(chat)/AGENTS.md`, `app/(chat)/*`, `purchase.request.assistant.service.ts`, `purchase.request.service.ts`, `app/(detail)/purchase-request.tsx`, category/timeline/share services.

| Done | ID     | P   | Test / steps                                                                                   | Expected result                                                                                                 | Result | Evidence | Observations / Bug ID |
| ---- | ------ | --- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ | -------- | --------------------- |
| [ ]  | REQ-01 | P0  | Enter buyer request assistant as buyer and seller.                                             | Buyer enters; seller is denied/redirected.                                                                      |        |          |                       |
| [ ]  | REQ-02 | P0  | Send first and multiple follow-up prompts.                                                     | One draft is created; latest successful `draft_id` is retained for every turn.                                  |        |          |                       |
| [ ]  | REQ-03 | P1  | Verify bubble styles, autoscroll, long text, keyboard, stop.                                   | Assistant/user presentation is correct; stop cancels cleanly without false error.                               |        |          |                       |
| [ ]  | REQ-04 | P0  | Inspect composer and attempt image attachment.                                                 | Buyer request assistant is text-only as required by scoped contract; attachment UI/input is unavailable.        |        |          |                       |
| [ ]  | REQ-05 | P0  | Reach ready state, show summary, then type more.                                               | One summary renders; typing sends `CONTINUE` first and exits stale review.                                      |        |          |                       |
| [ ]  | REQ-06 | P0  | Compare summary to backend contract with missing optional values.                              | Title/category/brand/dynamic attributes are correct; no broken/empty pills.                                     |        |          |                       |
| [ ]  | REQ-07 | P0  | Publish before ready, double-tap, retry after lost response.                                   | Publish is gated and idempotent; exactly one purchase request exists.                                           |        |          |                       |
| [ ]  | REQ-08 | P0  | Complete successful publish and open CTA.                                                      | One success state; CTA opens exact request; draft becomes published.                                            |        |          |                       |
| [ ]  | REQ-09 | P0  | Simulate 401/403/409/429/500, timeout, offline, and malformed AI response.                     | Safe localized error; `Retry-After` honored; draft/transcript remain recoverable.                               |        |          |                       |
| [ ]  | REQ-10 | P1  | Close assistant with and without navigation history.                                           | Returns safely to intended tabs route.                                                                          |        |          |                       |
| [ ]  | REQ-11 | P0  | Load active request detail and refresh after views/offers/status changes.                      | Raw status, summary, category, views, and offers match DB.                                                      |        |          |                       |
| [ ]  | REQ-12 | P0  | Search/filter offers by date/currency and run each per-currency sort.                          | Server-filtered list is correct; clear restores default; currencies remain separate.                            |        |          |                       |
| [ ]  | REQ-13 | P0  | Open `offer_accepted` and `canceled` requests.                                                 | Only selected offer and DB timeline/closure state appear as intended; retained chat is accessible when allowed. |        |          |                       |
| [ ]  | REQ-14 | P1  | Test timeline icons/dates/pre-label/completed/next and unknown icon/error.                     | Exact DB order/copy/state; safe icon fallback and retry.                                                        |        |          |                       |
| [ ]  | REQ-15 | P0  | Open seller business profile using unrelated and related request/offer/conversation IDs.       | Only buyer-authorized context resolves; legal/private fields never leak.                                        |        |          |                       |
| [ ]  | REQ-16 | P0  | Test cancellation eligibility, cancel/confirm, double-tap, and historically concretar request. | Menu only when eligible; allowed cancellation closes graph once; locked request cannot cancel.                  |        |          |                       |
| [ ]  | REQ-17 | P1  | Open category info for configured/empty/error category.                                        | Lineage and required/optional fields match DB; empty/error is accurate.                                         |        |          |                       |
| [ ]  | REQ-18 | P0  | Share request and open link after cold start/auth for both roles.                              | Exact role destination resolves once with authorization enforced.                                               |        |          |                       |

Section result: **NOT TESTED**<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 10. Seller offer creation, editing, fulfillment, and media

Sources: `app/(modal)/offer.tsx`, seller assistant services, `purchase.offer.service.ts`, delivery catalog, shared composer/file picker, offer/chat Storage policies.

| Done | ID     | P   | Test / steps                                                                              | Expected result                                                                                     | Result | Evidence | Observations / Bug ID |
| ---- | ------ | --- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ | -------- | --------------------- |
| [ ]  | OFF-01 | P0  | Execute DB create-offer action with valid and missing associations.                       | Correct assistant opens for valid conversation/request; invalid input is safe.                      |        |          |                       |
| [ ]  | OFF-02 | P0  | Send multi-turn offer assistant prompts and retry.                                        | One `offerDraftId`; retries do not duplicate turns/draft.                                           |        |          |                       |
| [ ]  | OFF-03 | P0  | Test 0/1/6/7 images; exact and over 3 MB; text at/over 4000.                              | Limits and actionable errors match UI contract; no rejected image persists.                         |        |          |                       |
| [ ]  | OFF-04 | P0  | Attempt publish with no accepted real photo.                                              | Publish is blocked until at least one valid accepted image exists.                                  |        |          |                       |
| [ ]  | OFF-05 | P0  | Ready→summary→continue→publish; double-tap and response loss.                             | Review is accurate; one idempotent offer is created and conversation opens once.                    |        |          |                       |
| [ ]  | OFF-06 | P0  | Stop/retry AI; simulate 409/429/503/offline/malformed response.                           | Recoverable errors and exact retry; no duplicate/partial offer.                                     |        |          |                       |
| [ ]  | OFF-07 | P0  | Edit existing offer with shipping-only, pickup-only, and both.                            | Payload normalizes description, price, currency, images, methods, and integer day fields correctly. |        |          |                       |
| [ ]  | OFF-08 | P0  | Add/remove one fulfillment method while retaining the other.                              | Only selected method changes; nullable timings remain valid.                                        |        |          |                       |
| [ ]  | OFF-09 | P0  | Submit blank description, zero/negative price, no currency/image/method.                  | Client and DB reject invalid payload with no partial mutation.                                      |        |          |                       |
| [ ]  | OFF-10 | P0  | Keep/remove existing images; upload JPG/PNG/WebP/GIF at/over 4 MB and spoofed bytes/MIME. | Valid paths work; invalid files fail; partial uploads are cleaned.                                  |        |          |                       |
| [ ]  | OFF-11 | P0  | Save valid edit and inspect DB/chat/timeline.                                             | Offer, fulfillment, images, summary, message, revision, and transition commit atomically.           |        |          |                       |
| [ ]  | OFF-12 | P0  | Cancel/discard offer in allowed/forbidden states and retry.                               | Ownership/state enforced; graph cleanup and notifications happen once.                              |        |          |                       |
| [ ]  | OFF-13 | P1  | Fail currency/delivery catalog load.                                                      | Accurate empty/error state; malformed payload cannot submit.                                        |        |          |                       |
| [ ]  | OFF-14 | P0  | Attempt another seller/business's image path or offer ID.                                 | Authorization denies access/mutation; no object metadata leaks.                                     |        |          |                       |

Section result: **NOT TESTED**<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 11. Conversations, messaging, actions, deadlines, realtime, and ratings

Sources: `app/(conversation)/AGENTS.md`, `app/(conversation)/*`, `conversation.service.ts`, `conversation.message.service.ts`, `src/components/conversation/*`, `src/components/popup/*`, DB conversation catalogs and RPCs.

Run the applicable state/action cases for both buyer and seller across all 12 live statuses: `REQUEST_OPENED`, `OFFER_MADE`, `OFFER_REJECTED`, `OFFER_ACCEPTED`, `SELLER_ACCEPTED`, `SENT_SHIPMENT`, `DELAYED_ACCEPTANCE`, `DELAYED_SHIPMENT`, `FINALIZED`, `REQUEST_CANCELED`, `REQUEST_DISCARDED`, `PARTICIPANT_DELETED`.

| Done | ID      | P   | Test / steps                                                                                          | Expected result                                                                                                                | Result | Evidence | Observations / Bug ID |
| ---- | ------- | --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ | -------- | --------------------- |
| [ ]  | CONV-01 | P0  | Load conversation as buyer, seller, outsider, missing/purged ID.                                      | Participants see authorized view; outsider/missing/purged exposes nothing and routes safely.                                   |        |          |                       |
| [ ]  | CONV-02 | P1  | Compare chat-list title, conversation header, sender labels, and fallbacks.                           | Row=counterpart; header=request title; labels use buyer name/seller business with safe fallback.                               |        |          |                       |
| [ ]  | CONV-03 | P0  | Load mixed chronological text/image/system/role-targeted messages.                                    | Correct order/visibility; only visible non-system counterpart messages are marked opened.                                      |        |          |                       |
| [ ]  | CONV-04 | P0  | Compare composer/attachment visibility for every status×role.                                         | Exact DB `can_send_messages` and `can_send_attachments` permissions are honored.                                               |        |          |                       |
| [ ]  | CONV-05 | P0  | Send text, image-only, and text+images; refresh/realtime during optimistic state.                     | Each logical message appears once and reconciles to server without duplicate bubble.                                           |        |          |                       |
| [ ]  | CONV-06 | P0  | Induce failure after text/image one in a multi-attachment send.                                       | Delivery is atomic or exposes explicit partial result with idempotent retry; no earlier part duplicates.                       |        |          |                       |
| [ ]  | CONV-07 | P0  | Upload JPG/PNG/WebP at/over 4 MB plus spoofed/foreign paths.                                          | Invalid input rejected; no pending/published orphan; foreign object denied.                                                    |        |          |                       |
| [ ]  | CONV-08 | P1  | Test image grouping within/over two minutes and 1/2/3/>3 viewer layouts.                              | Grouping/grid/full-screen previous/next/close are stable and accessible.                                                       |        |          |                       |
| [ ]  | CONV-09 | P0  | Send safe and disallowed text/image through moderation; simulate provider failure.                    | Safe content inserts once; blocked content inserts nothing; retryable sanitized error and no sensitive Sentry/log payload.     |        |          |                       |
| [ ]  | CONV-10 | P0  | Compare `TOP`, `AUX`, `MENU`, and `STATUS` slots to DB response.                                      | Order, placement, labels, icons, styles, and passive status cards match DB; no label-based dedupe.                             |        |          |                       |
| [ ]  | CONV-11 | P0  | Execute every server RPC action once and double-tap.                                                  | Actor/state/input enforced; one atomic mutation; refresh/success copy matches response.                                        |        |          |                       |
| [ ]  | CONV-12 | P0  | Execute client commands for create/edit offer, FAQ, business, favorite, close, plus unknown executor. | Valid command routes correctly; unknown/incomplete executor makes no mutation and gives safe error.                            |        |          |                       |
| [ ]  | CONV-13 | P0  | Inspect every confirmation template and interpolation variant.                                        | DB title/description/rows/icons/buttons/styles/conditions render exactly; no raw placeholder.                                  |        |          |                       |
| [ ]  | CONV-14 | P0  | Submit confirmations with missing required textarea/choice/OTP/rating and disabled choices.           | Validation blocks execution; disabled reason/setup action is correct; parent confirmation survives setup round-trip.           |        |          |                       |
| [ ]  | CONV-15 | P0  | Complete pickup using correct, wrong, expired, reused, cross-conversation, and five-failure OTP.      | 4-digit code is bound/one-time/rate-limited; correct completes atomically; shipping never asks for pickup OTP.                 |        |          |                       |
| [ ]  | CONV-16 | P0  | Complete rating as buyer/seller before and after finalization; invalid 0/6/tag payload; retry.        | Only valid participant/direction after finalization; one rating each; summaries update; action disappears per rater only.      |        |          |                       |
| [ ]  | CONV-17 | P0  | Walk every allowed/forbidden lifecycle transition for shipping and pickup.                            | Status/history/request/offer/deadline/system message/notification change atomically and match transition catalog.              |        |          |                       |
| [ ]  | CONV-18 | P0  | Test deadline before, at, after due; delayed paths and worker.                                        | Correct Costa Rica time/copy/action; due transition once; future/mismatch untouched.                                           |        |          |                       |
| [ ]  | CONV-19 | P0  | Report and block counterpart; repeat; inspect reported party notifications/discovery.                 | Report private/idempotent; no alert to reported party; block suppresses contact/discovery as DB defines.                       |        |          |                       |
| [ ]  | CONV-20 | P0  | Subscribe buyer, seller, and outsider to Realtime; send message/deadline/rating/action.               | Participants receive authorized refresh hints only; outsider receives nothing; no raw OTP/message/action payload in broadcast. |        |          |                       |
| [ ]  | CONV-21 | P0  | Disconnect Realtime, background/foreground, then mutate from other device.                            | Reconnect catches up; local actions still work; no permanent stale state/duplicates.                                           |        |          |                       |
| [ ]  | CONV-22 | P0  | Race send message against terminal transition from another session.                                   | No message commits after terminal state; no partial history/message/notification.                                              |        |          |                       |
| [ ]  | CONV-23 | P0  | Race two actions/ratings/reports and retry response loss.                                             | Server/client idempotency prevents duplicate effects.                                                                          |        |          |                       |
| [ ]  | CONV-24 | P1  | Test long messages, keyboard, scroll, loading, empty, and retry states.                               | Composer/footer remains usable; history readable; no clipped or trapped UI.                                                    |        |          |                       |

Section result: **NOT TESTED**<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 12. Notifications and push

Sources: `app/(detail)/notifications.tsx`, `notification.service.ts`, push provider/helpers/service, local `process-push-notifications`, push migration/test, Expo notification configuration.

| Done | ID      | P   | Test / steps                                                                          | Expected result                                                                                        | Result | Evidence | Observations / Bug ID |
| ---- | ------- | --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ | -------- | --------------------- |
| [ ]  | NOT-01  | P0  | Load notifications under multiple profiles.                                           | Only active-profile non-dismissed rows, newest first, with correct urgent/action/info tone.            |        |          |                       |
| [ ]  | NOT-02  | P0  | Open one notification then read/dismiss all.                                          | Only owned rows mutate; authoritative unread counts/timestamps return; dismissal preserves history.    |        |          |                       |
| [ ]  | NOT-03  | P0  | Test allowlisted and arbitrary notification destinations.                             | Exact conversation/request/business-verification opens; arbitrary path is ignored safely.              |        |          |                       |
| [ ]  | NOT-04  | P1  | Cancel/confirm `Limpiar todas`; retry failure.                                        | Cancel is no-op; confirm dismisses current rows once; recoverable error preserves rows.                |        |          |                       |
| [ ]  | PUSH-00 | P0  | Verify clean push commit, migration, tables/RPCs/config, deployed function, and cron. | All intended push components exist in target; complete platform E2E evidence before marking this case. |        |          |                       |
| [ ]  | PUSH-01 | P0  | Fresh install: postpone, allow, deny, then grant in settings.                         | Prompt policy is correct; registration reflects permission; no prompt loop.                            |        |          |                       |
| [ ]  | PUSH-02 | P0  | Rotate/reinstall token; sign out; use multiple devices/profiles.                      | Owner-bound registrations update; sign-out unregisters current device only; no cross-account delivery. |        |          |                       |
| [ ]  | PUSH-03 | P0  | Receive generic message notification foreground/background/terminated.                | Generic lock-screen copy; active-conversation foreground banner/sound suppressed; in-app row remains.  |        |          |                       |
| [ ]  | PUSH-04 | P0  | Tap cold/warm push for same and different owned profile.                              | Destination handled once; profile switches before navigation; notification marks read.                 |        |          |                       |
| [ ]  | PUSH-05 | P0  | Send malformed/unowned-profile/unallowlisted payload and duplicate response ID.       | No leak/navigation; duplicate consumed once.                                                           |        |          |                       |
| [ ]  | PUSH-06 | P0  | Trigger offer/delivery/identity/business critical events.                             | Only approved events enqueue/deliver with generic safe text and correct destination.                   |        |          |                       |
| [ ]  | PUSH-07 | P0  | Exercise Expo ticket/receipt success, 429/5xx, permanent invalid token.               | Lease/retry prevents duplicates; permanent `DeviceNotRegistered` deactivates token.                    |        |          |                       |
| [ ]  | PUSH-08 | P1  | Test simulator/web/permission-unavailable environment.                                | Feature degrades without crash or false registration.                                                  |        |          |                       |
| [ ]  | PUSH-09 | P0  | Inspect Android channel and lock-screen privacy; iOS foreground behavior.             | High-importance private channel as intended; no request/message/identity detail leaks.                 |        |          |                       |

Section result: **NOT TESTED**<br>
Push scope decision (included / removed from MVP):<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 13. Account, business, team, verification, safety, and deletion

Sources: profile/account/business screens and services, business verification, invitations, blocked accounts, identity/profile-image services, account deletion functions/runbook.

| Done | ID      | P   | Test / steps                                                                          | Expected result                                                                                               | Result | Evidence | Observations / Bug ID |
| ---- | ------- | --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ | -------- | --------------------- |
| [ ]  | ACC-01  | P1  | Compare buyer/seller profile overview and ratings to DB.                              | Stats, rating counts, membership, location, categories, preset match authoritative summaries.                 |        |          |                       |
| [ ]  | ACC-02  | P0  | Edit phone/name/document for verified and unverified identities.                      | Phone read-only; verified identity fields immutable; allowed edits validate/refresh.                          |        |          |                       |
| [ ]  | ACC-03  | P0  | Set/change email; opt in; wrong/expired/reused code; resend/restart/cross-profile.    | Normalized unique email and consent update atomically after correct 4-digit OTP; cooldown/server limits hold. |        |          |                       |
| [ ]  | ACC-04  | P0  | Upload/replace/remove profile and business image as owner/member/buyer.               | Correct permission, crop/preview/fallback, and DB/storage sync; member cannot change business image.          |        |          |                       |
| [ ]  | ACC-05  | P0  | Image at/over 4 MB; spoofed extension/MIME/bytes; moderation rejection/outage.        | Invalid/blocked image never publishes; previous image remains; staging cleaned.                               |        |          |                       |
| [ ]  | ACC-06  | P0  | Simulate DB metadata-clear failure during image deletion.                             | DB never references an object already deleted; operation is recoverable/atomic.                               |        |          |                       |
| [ ]  | ACC-07  | P1  | Owner/member edit business commercial name.                                           | Owner can save normalized ≤120 chars; member cannot enter/mutate.                                             |        |          |                       |
| [ ]  | ACC-08  | P0  | Search/add/remove/save/cancel business categories as owner/member.                    | Local edits persist only on save; cancel restores; member read-only; home gate updates immediately.           |        |          |                       |
| [ ]  | ACC-09  | P1  | Select CR province→canton→district, inactive current location, owner/member.          | Active catalog cascades correctly; only district ID saves; restrictions/warnings accurate.                    |        |          |                       |
| [ ]  | ACC-10  | P0  | View team/invitations as owner/member; invite invalid/self/existing/new phone.        | Owner-only data/actions; recipient masked; valid invite expires in 7 days and is in-app, not SMS.             |        |          |                       |
| [ ]  | ACC-11  | P0  | Revoke invite/remove member; test owner/history blockers and concurrent accept.       | State/ownership enforced; accepted invite single-use; no eligible member removed incorrectly.                 |        |          |                       |
| [ ]  | BV-01   | P0  | Open business verification without verified opted-in email.                           | Submission blocked with correct setup path.                                                                   |        |          |                       |
| [ ]  | BV-02   | P0  | Submit RNP plus 1/5/6 evidence files; exact/over 5 MB; PDF/JPG/PNG/spoof.             | Valid application becomes `PENDING`; invalid files/count fail; evidence private.                              |        |          |                       |
| [ ]  | BV-03   | P0  | Re-submit in review and `NEEDS_ACTION`; lose response after commit.                   | In-review duplicate 409; new version audited; committed evidence/application remains discoverable.            |        |          |                       |
| [ ]  | BV-04   | P0  | Reviewer approves/rejects/stale version; applicant attempts private-table access.     | Decision audited/idempotent; approval creates one business/owner; applicant cannot read review data.          |        |          |                       |
| [ ]  | BV-05   | P0  | Fail email/provider after final decision.                                             | App notification/state remain correct and email can retry without losing the only decision notice.            |        |          |                       |
| [ ]  | SAFE-01 | P0  | Report/block/unblock as buyer/seller/business; cancel unblock.                        | Active-profile and directional/business-wide rules match DB; only owner unblocks; history remains private.    |        |          |                       |
| [ ]  | ACC-12  | P0  | Sign out cancel/confirm.                                                              | Cancel preserves session; confirm clears local private state and device registration as intended.             |        |          |                       |
| [ ]  | DEL-01  | P0  | Attempt separate deletion of last profile and prohibited owner/profile states.        | Blocked with correct explanation; directs to full account deletion when required.                             |        |          |                       |
| [ ]  | DEL-02  | P0  | Delete eligible profile with 6-digit reauth OTP; wrong/expired/reused/cross-user OTP. | Only fresh correct boundary succeeds once; remaining profile becomes active; Auth account remains.            |        |          |                       |
| [ ]  | DEL-03  | P0  | Delete full account with fresh OTP; retry after lost response.                        | One auditable request/receipt/reference/due date; local sign-out; duplicate returns existing/409 safely.      |        |          |                       |
| [ ]  | DEL-04  | P0  | Delete business owner with surviving members/conversation history.                    | Oldest eligible member promoted; allowed business/offer history survives; participant tombstoned.             |        |          |                       |
| [ ]  | DEL-05  | P0  | Run worker with Storage/Didit/Auth partial failures and retry.                        | Recoverable lease/manifest; Auth deleted only after preparation; no lost cleanup or duplicate deletion.       |        |          |                       |
| [ ]  | DEL-06  | P0  | Verify five-business-day SLA, overdue alert, completion email, and support alert.     | Operational notifications work, or missing implementation is explicitly accepted before sign-off.             |        |          |                       |
| [ ]  | DEL-07  | P0  | Log in after pending/completed deletion and inspect retained counterpart history.     | Pending login rejected safely; retained history sanitized/pseudonymized and still loadable by survivor.       |        |          |                       |

Section result: **NOT TESTED**<br>
Deletion email/support-alert scope decision:<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 14. Help, legal, support, accessibility, platform, and resilience

Sources: FAQ/legal/support services and screens, shared components, `app.json`, Expo configuration, Sentry integration.

| Done | ID        | P   | Test / steps                                                                                                                         | Expected result                                                                                                       | Result | Evidence | Observations / Bug ID |
| ---- | --------- | --- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------ | -------- | --------------------- |
| [ ]  | HELP-01   | P1  | Load FAQ, expand/collapse, long content, empty/error/retry.                                                                          | Active DB rows in order; stable accordion and accurate states.                                                        |        |          |                       |
| [ ]  | HELP-02   | P1  | Open support email with valid/missing config and unavailable mail app.                                                               | Value comes from `app_config`; safe fallback/error.                                                                   |        |          |                       |
| [ ]  | LEGAL-01  | P0  | Load current Terms/Privacy and unknown code.                                                                                         | Correct title/version/effective date/ordered sections; safe unknown/error state.                                      |        |          |                       |
| [ ]  | LEGAL-02  | P0  | Publish superseding required version and test all owned profiles.                                                                    | Gate reappears exactly when required; acceptance is immutable/audited.                                                |        |          |                       |
| [ ]  | A11Y-01   | P1  | VoiceOver/TalkBack full P0 smoke path.                                                                                               | Meaningful role/name/state for tabs, filters, unread, OTP, images, deadlines, popups, and actions.                    |        |          |                       |
| [ ]  | A11Y-02   | P1  | Dynamic text default/150%/200% on small iOS/Android.                                                                                 | No clipped grouped rows/actions/summaries/composers; critical text remains readable.                                  |        |          |                       |
| [ ]  | A11Y-03   | P1  | Keyboard through every form/filter/assistant/chat/popup.                                                                             | Focus visible; body scrolls; footer/action remains reachable; no data loss on dismiss.                                |        |          |                       |
| [ ]  | A11Y-04   | P1  | Test touch targets, long press vs tap, reduced motion, loading announcements, non-color status.                                      | Core interactions are perceivable and operable without timing/color dependence.                                       |        |          |                       |
| [ ]  | UI-01     | P1  | Light/dark automatic appearance, notches, safe areas, Android edge-to-edge.                                                          | No unreadable contrast, overlap, detached header/nav, or unsafe-area clipping.                                        |        |          |                       |
| [ ]  | UI-02     | P1  | Verify supported device policy.                                                                                                      | Portrait-only and iPad support state match product/store claims; unsupported layouts fail gracefully.                 |        |          |                       |
| [ ]  | RES-01    | P0  | Offline cold start/auth/home/pagination/AI/upload/chat/action/notification/legal/support.                                            | Bounded loading and recoverable error; no permanent blank screen or false success.                                    |        |          |                       |
| [ ]  | RES-02    | P0  | Slow/intermittent network and out-of-order responses while switching profile/filter/conversation.                                    | Newest context wins; no cross-profile or stale overwrite.                                                             |        |          |                       |
| [ ]  | RES-03    | P0  | Background/force-quit during upload/action/OTP/publish then resume.                                                                  | One committed result or explicit retry; no duplicate/orphan/hidden success.                                           |        |          |                       |
| [ ]  | SEC-UI-01 | P0  | Direct-ID attempts across user/profile for request, offer, conversation, notification, business, block, image, invitation, deletion. | All unauthorized access denied without existence/PII leakage.                                                         |        |          |                       |
| [ ]  | SEC-UI-02 | P0  | Inspect signed URLs and removed/replaced/purged files.                                                                               | Only authorized files load; expired/deleted paths become unavailable as policy requires.                              |        |          |                       |
| [ ]  | SEC-UI-03 | P0  | Review device logs, Sentry, DB/Edge logs, screenshots, push/email evidence.                                                          | No token, OTP, session, private broadcast body, raw identity/evidence, unmoderated message, or full sensitive prompt. |        |          |                       |
| [ ]  | RES-04    | P0  | Trigger 401/403/404/409/429/500, malformed JSON, missing optional metadata, provider error.                                          | Stable localized/sanitized error and correct retry/reauth behavior.                                                   |        |          |                       |
| [ ]  | PERF-01   | P1  | Measure cold start, home, pagination, chat load/send, buyer/seller AI p50/p95 on release devices.                                    | Results meet agreed target; no obvious regression or unbounded wait.                                                  |        |          |                       |
| [ ]  | OBS-01    | P0  | Correlate a controlled failure app→Edge→DB/provider using request ID.                                                                | Trace is possible end to end without logging secrets/PII.                                                             |        |          |                       |

Section result: **NOT TESTED**<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 15. Database contract, security, integrity, and runtime acceptance

Sources are in `../luppit-supabase/supabase/tests/database/`, migrations, `scripts/verify-runtime.sql`, legal/deletion/business-verification docs, and live Supabase metadata.

| Done | ID    | P   | Acceptance test                       | Expected result                                                                                               | Automated/source evidence                       | Result | Observations / Bug ID |
| ---- | ----- | --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------ | --------------------- |
| [ ]  | DB-01 | P0  | Fresh rebuild and seed.               | All migrations apply in order; seed rerunnable; no user/operational rows; buckets reconcile.                  | README, seed, CI workflow                       |        |                       |
| [ ]  | DB-02 | P0  | Application RPC/grant contract.       | Every literal app/executor RPC resolves; only intended role/grant/signature is callable.                      | `application_rpc_contract.test.sql`             |        |                       |
| [ ]  | DB-03 | P0  | Runtime declarations.                 | Exactly 8 intended active cron jobs and 8 buckets with exact schedule/config.                                 | `runtime_configuration.test.sql`, verify script |        |                       |
| [ ]  | DB-04 | P0  | `app_config` and public site config.  | Auth read-only, anon table denied, public RPC allowlist only, no secret/deletion status URL.                  | `app_config_access.test.sql`                    |        |                       |
| [ ]  | DB-05 | P0  | Legal 1.1 publication/checksum.       | Terms/Privacy immutable, active, correct effective date/sections, canonical SHA-256.                          | legal verification script/migrations            |        |                       |
| [ ]  | DB-06 | P0  | Profile creation and invitation path. | Seller profile/business membership/default/invitation state correct and idempotent.                           | `profile_creation.test.sql`                     |        |                       |
| [ ]  | DB-07 | P0  | Identity and one-buyer invariant.     | Cannot bypass Didit/duplicate buyer; verified name immutable; raw document not stored on profile.             | `identity_verification.test.sql`                |        |                       |
| [ ]  | DB-08 | P0  | Manual business verification.         | Restricted seller gated; evidence/version/review audited; approval creates one business; private data denied. | `manual_business_verification.test.sql`         |        |                       |
| [ ]  | DB-09 | P0  | Business team/invitations.            | Owner-only reads/actions; identity masked; protected members retained; invitation single-use.                 | `business_team_management.test.sql`             |        |                       |
| [ ]  | DB-10 | P0  | Seller opportunity discovery.         | Accent-insensitive combined filters, segments, DB sorts, stable pagination/totals, privacy boundaries.        | `seller_opportunity_discovery.test.sql`         |        |                       |
| [ ]  | DB-11 | P0  | Open conversation/create offer.       | No self-open; canonical reuse; visualization/history/message/notification deduped; atomic offer graph.        | `seller_open_and_offer_create.test.sql`         |        |                       |
| [ ]  | DB-12 | P0  | Offer update/cancel.                  | Ownership, positive pricing, currency/image/method lock, rollback, cleanup, idempotency.                      | `seller_offer_update_and_cancel.test.sql`       |        |                       |
| [ ]  | DB-13 | P0  | Buyer accept offer.                   | Owner only; revision/fulfillment explicit; pickup email required; siblings close atomically; retry safe.      | buyer acceptance tests                          |        |                       |
| [ ]  | DB-14 | P0  | Buyer reject/seller discard.          | Actor/state enforced; exact history/message/notification once; invalid retry rejected.                        | reject/discard test                             |        |                       |
| [ ]  | DB-15 | P0  | Seller concretar/buyer cancel.        | Fulfillment required; copy correct; 3-day deadline; cancellation resolves deadline/OTP.                       | concretar/cancel test                           |        |                       |
| [ ]  | DB-16 | P0  | Shipping completion and deadlines.    | Correct deadlines/transitions; service-only worker; due rows once; future/mismatch safe.                      | shipping/deadline test                          |        |                       |
| [ ]  | DB-17 | P0  | Pickup OTP.                           | 4 digits, hashed, bound, 10-minute expiry, rate/attempt limits, one-time, atomic rollback.                    | pickup OTP tests                                |        |                       |
| [ ]  | DB-18 | P0  | OTP email handoff.                    | Server-created purpose-bound request; service-only one-time consume; plaintext deleted; replay fails.         | OTP delivery security test                      |        |                       |
| [ ]  | DB-19 | P0  | Message permission/visibility matrix. | Every status×role cardinality; payload validation; participant-only; targeted/open state correct.             | message visibility test                         |        |                       |
| [ ]  | DB-20 | P0  | Transition/UI metadata oracle.        | Exact graph, aliases, rules, executors, deadlines, confirmations, timeline, slots.                            | transition catalog/oracle tests                 |        |                       |
| [ ]  | DB-21 | P0  | Ratings.                              | Participants only after finalization; 1–5; correct targets/summaries; one per direction.                      | ratings test                                    |        |                       |
| [ ]  | DB-22 | P0  | Buyer-visible business profile.       | Owned context required; legal fields excluded; location/ratings/categories/reviews authoritative.             | business profile test                           |        |                       |
| [ ]  | DB-23 | P0  | Notification read/dismiss.            | Owned-profile only, authoritative count/timestamp, idempotent, history retained.                              | notification read test                          |        |                       |
| [ ]  | DB-24 | P0  | Push outbox.                          | Owner-bound device; safe critical policy; worker lease/receipts/retry; invalid token deactivated.             | push test/migration                             |        |                       |
| [ ]  | DB-25 | P0  | Safety and legal gate.                | Acceptance required; report private/idempotent; block suppresses intended interactions; owner-only unblock.   | SAFE-01 tests/review                            |        |                       |
| [ ]  | DB-26 | P0  | Moderated profile images.             | Canonical staging only; no enumeration/direct publish; atomic audited finalize; flagged keeps current.        | image tests                                     |        |                       |
| [ ]  | DB-27 | P0  | Storage access boundary.              | Buyer/seller/team/outsider policies correct; no overwrite/enumeration; orphan delete owner-scoped.            | SEC-02/storage tests                            |        |                       |
| [ ]  | DB-28 | P0  | General RLS/BOLA.                     | Direct private/full reads and public writes denied; aggregate hides identity; participant scoping.            | SEC-01 tests                                    |        |                       |
| [ ]  | DB-29 | P0  | Request cancellation lifecycle.       | Ownership/history lock; conversations close; discovery/message/offer suppressed; cleanup/purge deduped.       | cancellation lifecycle test                     |        |                       |
| [ ]  | DB-30 | P0  | Account/profile deletion pipeline.    | Fresh OTP; one audit; leases/retry/SLA; pseudonymized legal audit; fail closed.                               | legal deletion test                             |        |                       |
| [ ]  | DB-31 | P0  | Deletion integration.                 | Owner promotion; allowed business/offer survives; participant/text/read state sanitized.                      | deletion integration test                       |        |                       |
| [ ]  | DB-32 | P1  | Public waitlist.                      | Private table denied; double opt-in/rates/hash/retry/erasure/retention correct.                               | waitlist security test                          |        |                       |

Section result: **NOT TESTED**<br>
pgTAP run URL/output:<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 16. Edge Functions and external-provider acceptance

Sources: `ai-edge-functions/supabase/functions/*`, `supabase/config.toml`, deploy scripts, integration docs, OpenAI/Resend/Didit/Expo/Sentry behavior.

| Done | ID          | P   | Test / steps                                                                                                                      | Expected result                                                                                                                                           | Result | Evidence | Observations / Bug ID |
| ---- | ----------- | --- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- | --------------------- |
| [ ]  | INT-00      | P0  | Create/use a separate staging Supabase project or branch with isolated secrets/data.                                              | Destructive, race, rate-limit, webhook, and provider-fault tests can run without production risk. Preparation baseline: no staging project/branch exists. |        |          |                       |
| [ ]  | INT-01      | P0  | Compare 16 intended functions to deploy manifest/live inventory/JWT settings.                                                     | Exact intended parity; worker/webhook/public exceptions have their own verified auth.                                                                     |        |          |                       |
| [ ]  | INT-02      | P0  | Call every function without auth, with expired token, wrong-profile token, malformed body, and wrong method/origin as applicable. | Non-enumerating 4xx; no mutation; CORS/method/body rules correct.                                                                                         |        |          |                       |
| [ ]  | BAI-01      | P0  | Buyer AI multi-turn happy path, correction, summary, continue, publish.                                                           | Stable draft; corrections remove stale attributes; exactly one request.                                                                                   |        |          |                       |
| [ ]  | BAI-02      | P0  | Vague/out-of-scope/FAQ prompt and “brand does not matter”.                                                                        | No fabricated required values; out-of-scope content does not corrupt draft.                                                                               |        |          |                       |
| [ ]  | BAI-03      | P0  | Replay identical buyer idempotency key/payload, then changed payload.                                                             | Same result/replay indication for identical; 409 for conflict.                                                                                            |        |          |                       |
| [ ]  | BAI-04      | P0  | Fail buyer request with 503/transport, then retry from UI.                                                                        | UI reuses request identity; no duplicate/orphan draft/request.                                                                                            |        |          |                       |
| [ ]  | BAI-05      | P0  | Hit buyer text/image/action rate buckets.                                                                                         | Documented limits return 429 + valid `Retry-After`, then recover.                                                                                         |        |          |                       |
| [ ]  | BAI-06      | P0  | Concurrent publish from double tap/two devices.                                                                                   | Exactly one purchase request.                                                                                                                             |        |          |                       |
| [ ]  | SAI-01      | P0  | Approved vs restricted seller enters offer AI.                                                                                    | Restricted seller 403; approved seller can continue.                                                                                                      |        |          |                       |
| [ ]  | SAI-02      | P0  | Seller AI prompt→pricing/currency→fulfillment→photo→publish.                                                                      | Correct ready state and exactly one complete offer.                                                                                                       |        |          |                       |
| [ ]  | SAI-03      | P0  | Seller idempotent replay/conflict, 429/503/network retry, stop.                                                                   | Stable request identity; 409 conflict; no duplicate/undiscoverable draft.                                                                                 |        |          |                       |
| [ ]  | SAI-04      | P0  | Foreign conversation/draft/existing offer.                                                                                        | Denied without existence leak; no duplicate offer.                                                                                                        |        |          |                       |
| [ ]  | MSG-EF-01   | P0  | Send allowed/blocked text and image through moderation function.                                                                  | Allowed inserts once; blocked inserts nothing; safe response and audit.                                                                                   |        |          |                       |
| [ ]  | MSG-EF-02   | P0  | OpenAI/Storage outage and multi-image partial failure.                                                                            | No sensitive log; no orphan; atomic or explicit idempotent partial recovery.                                                                              |        |          |                       |
| [ ]  | PIMG-EF-01  | P0  | Moderate/replace buyer and business image; member attempt.                                                                        | Authorized valid publish; member denied; previous image handled correctly.                                                                                |        |          |                       |
| [ ]  | PIMG-EF-02  | P0  | Rejection/OpenAI failure/Storage failure/deletion metadata failure.                                                               | Current DB/object reference remains consistent; staging cleaned; retry safe.                                                                              |        |          |                       |
| [ ]  | BV-EF-01    | P0  | Submit valid/invalid business evidence and replay lost response.                                                                  | Private evidence; versioned application; invalid cleanup; committed submission rediscoverable.                                                            |        |          |                       |
| [ ]  | BV-EF-02    | P0  | Send decision email; simulate Resend failure/retry.                                                                               | Correct recipient/safe content; retry does not duplicate or lose final notice.                                                                            |        |          |                       |
| [ ]  | EMAIL-EF-01 | P0  | Verification and delivery OTP email success/failure/replay.                                                                       | Purpose-bound correct recipient/template; code absent from caller/log; outage is recoverable.                                                             |        |          |                       |
| [ ]  | KYC-EF-01   | P0  | Start Didit and process success/rejection/action-required/underage.                                                               | Attempt/user/environment bind correctly; final state/profile is correct once.                                                                             |        |          |                       |
| [ ]  | KYC-EF-02   | P0  | Invalid/stale/wrong-environment/replayed webhook.                                                                                 | HMAC/timestamp/workflow enforced; replay rejected or idempotent once.                                                                                     |        |          |                       |
| [ ]  | KYC-EF-03   | P0  | Drop webhook and run reconciliation worker.                                                                                       | Cron/worker reconciles within expected five-minute window with no duplicate attempt.                                                                      |        |          |                       |
| [ ]  | DEL-EF-01   | P0  | Account/profile request endpoints with missing/stale/other-user reauth and replay.                                                | Fresh bearer+OTP required; one request/receipt; no secret/status URL leak.                                                                                |        |          |                       |
| [ ]  | DEL-EF-02   | P0  | Deletion worker auth, lease, partial failure, retry, absent Auth user.                                                            | Automation secret required; idempotent recoverable processing and manifest preservation.                                                                  |        |          |                       |
| [ ]  | PUSH-EF-01  | P0  | Push worker auth, leasing, Expo tickets/receipts, retries.                                                                        | Automation secret; no duplicate delivery; invalid token deactivates.                                                                                      |        |          |                       |
| [ ]  | WL-EF-01    | P1  | Waitlist origin/preflight/method/body/honeypot/duplicate/rate tests.                                                              | Generic non-enumerating responses; restrictions and cooldown hold.                                                                                        |        |          |                       |
| [ ]  | WL-EF-02    | P1  | Confirmation token success/wrong/expired/replay and Resend failure.                                                               | Double opt-in once; hash-only storage; failure releases reservation for retry.                                                                            |        |          |                       |
| [ ]  | OBS-EF-01   | P0  | Trigger controlled error in each provider family and inspect Sentry/logs.                                                         | Correct env/release/fingerprint/request ID; no OTP/token/email/prompt/identity/evidence/session.                                                          |        |          |                       |
| [ ]  | PERF-EF-01  | P1  | Run realistic buyer/seller AI smoke and benchmark helpers.                                                                        | Functional scenarios pass; p50/p95 documented against agreed threshold.                                                                                   |        |          |                       |
| [ ]  | PAY-01      | P2  | Confirm product/release claims around payment.                                                                                    | Explicit `N/A`: MVP has price/fulfillment/delivery confirmation, no checkout/capture/escrow/in-app payment.                                               |        |          |                       |

Section result: **NOT TESTED**<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 17. External staging, race, restore, and operations tests

These cases cannot be proven honestly by one-session pgTAP or helper unit tests.

| Done | ID     | P   | Manual staging test                                                                      | Expected result                                                                     | Result | Evidence | Observations / Bug ID |
| ---- | ------ | --- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------ | -------- | --------------------- |
| [ ]  | EXT-01 | P0  | Two sellers concurrently open the same request.                                          | Exactly one conversation per seller/request; loser reuses canonical row.            |        |          |                       |
| [ ]  | EXT-02 | P0  | Send while other session performs terminal transition.                                   | No post-terminal message and no partial DB/notification effect.                     |        |          |                       |
| [ ]  | EXT-03 | P0  | Run overlapping deadline/deletion/Didit/push workers.                                    | Rows leased once; no duplicate/deadlock/starvation.                                 |        |          |                       |
| [ ]  | EXT-04 | P0  | Call every overloaded RPC through real PostgREST/app client.                             | Correct signature dispatch; no ambiguous or unintended legacy RPC.                  |        |          |                       |
| [ ]  | EXT-05 | P0  | Storage upload/download/list/delete as buyer, owner, member, outsider.                   | Exact RLS; private buckets cannot enumerate/publicize; cleanup works.               |        |          |                       |
| [ ]  | EXT-06 | P0  | Realtime subscribe as both participants and outsider.                                    | Authorized refresh only for participants; outsider none.                            |        |          |                       |
| [ ]  | EXT-07 | P0  | End-to-end OTP/verification mail through Edge/DB/Resend.                                 | Correct purpose/recipient/template; no code leak; replay fails.                     |        |          |                       |
| [ ]  | EXT-08 | P0  | Didit sandbox success/reject/replay/delayed webhook/worker retry.                        | One provider session/final state; retries and webhook are idempotent.               |        |          |                       |
| [ ]  | EXT-09 | P0  | Real business evidence upload, reviewer decision, email/notification.                    | Evidence private; stale decision fails; one business on approval.                   |        |          |                       |
| [ ]  | EXT-10 | P0  | Expo end-to-end on physical iOS/Android.                                                 | Only intended safe pushes; receipts close delivery; revoked token stops.            |        |          |                       |
| [ ]  | EXT-11 | P0  | Account deletion with Storage/provider partial failure and retry.                        | Request recoverable; Auth last; cleanup manifest retained.                          |        |          |                       |
| [ ]  | EXT-12 | P0  | Verify every cron invokes worker with rotated Vault secret.                              | Correct live invocation; missing/invalid secret alerts and does not count as ready. |        |          |                       |
| [ ]  | EXT-13 | P0  | Fetch four canonical legal/support/deletion URLs and compare active DB version/checksum. | Public accessible canonical content; no deprecated deletion-status URL.             |        |          |                       |
| [ ]  | EXT-14 | P0  | Full DB/Auth/bucket/Storage backup and restore plus deletion-ledger replay.              | Service restores; previously deleted identities/content do not reappear.            |        |          |                       |
| [ ]  | EXT-15 | P0  | Linked production preflight and drift check from clean main commit.                      | Current CI green; plan reviewed; linked verify passes; zero unexplained drift.      |        |          |                       |

Section result: **NOT TESTED**<br>
Open bugs/blockers:<br>
Owner/sign-off/date:

## 18. Automated coverage record

`PASS (observed)` is preparation-time evidence only. Re-run every required command on the exact release commit.

| Done | ID      | P   | Command / suite                   | Preparation baseline                                               | Release result | Evidence URL/path | Notes / Bug ID                                                              |
| ---- | ------- | --- | --------------------------------- | ------------------------------------------------------------------ | -------------- | ----------------- | --------------------------------------------------------------------------- |
| [x]  | AUTO-01 | P0  | `npm run test:unit`               | PASS: 22/22 on 2026-08-18                                          | PASS: 30/30 on 2026-08-22 | Local terminal | Push and launcher tests included.                              |
| [x]  | AUTO-02 | P0  | `npm run lint`                    | PASS on 2026-08-18                                                 | PASS on 2026-08-22 | Local terminal |                                                                             |
| [x]  | AUTO-03 | P0  | `npx tsc --noEmit`                | PASS on 2026-08-18                                                 | PASS on 2026-08-22 | Local terminal |                                                                             |
| [x]  | AUTO-04 | P1  | Hermetic Edge Node suite          | PASS: 19/19 observed by inventory agent                            |                |                   | Re-run from clean commit.                                                   |
| [x]  | AUTO-05 | P0  | Full Edge Deno suite              | Not run: Deno unavailable; 28 files / 144 declared tests inspected | PASS: 168/168 on 2026-08-22 | Local terminal | Current full suite.                                              |
| [x]  | AUTO-06 | P0  | Edge function type checks         | Not run                                                            | PASS on 2026-08-22 | Local terminal | Every tracked entrypoint checked with its function config.                  |
| [x]  | AUTO-07 | P0  | DB reset + pgTAP                  | Documented PASS: 1,107 assertions, not rerun                       | PASS: 1,107 on 2026-08-22 | Local terminal | Clean reset plus bucket reconciliation.                         |
| [x]  | AUTO-08 | P0  | DB linked verify/runtime/security | Not run for release                                                | PASS on 2026-08-22 | Local terminal | Migration parity, dry-run, runtime assertions, lint, and zero schema drift. |
| [ ]  | AUTO-09 | P1  | AI smoke/benchmark helpers        | Not run; 19 credential-dependent helpers exist                     |                |                   | Use staging provider credentials.                                           |
| [ ]  | AUTO-10 | P0  | CI workflows for app/DB/Edge      |                                                                    |                |                   | Record exact workflow/run/commit.                                           |

Automated section result: **INCOMPLETE FOR RELEASE**<br>
Owner/sign-off/date:

## 19. Release-candidate smoke suite

Run this sequence without shortcuts on the exact release build after the full suite is green. Run once on physical iOS and once on physical Android. A smoke failure reopens the affected full section.

| Done | ID     | P   | Smoke action                                                                  | iOS result/evidence | Android result/evidence | Bug ID |
| ---- | ------ | --- | ----------------------------------------------------------------------------- | ------------------- | ----------------------- | ------ |
| [ ]  | SMK-01 | P0  | Fresh install/cold launch signed out; open Terms/Privacy.                     |                     |                         |        |
| [ ]  | SMK-02 | P0  | Login with OTP; relaunch restores correct profile.                            |                     |                         |        |
| [ ]  | SMK-03 | P0  | Verify legal/email/setup gates with a gated fixture.                          |                     |                         |        |
| [ ]  | SMK-04 | P0  | Switch buyer↔seller profile; verify data/nav isolation.                       |                     |                         |        |
| [ ]  | SMK-05 | P0  | Buyer home load, stage, segment, filter, pagination, favorite.                |                     |                         |        |
| [ ]  | SMK-06 | P0  | Buyer AI multi-turn request, review, publish exactly once.                    |                     |                         |        |
| [ ]  | SMK-07 | P0  | Open/share published request and verify detail/timeline.                      |                     |                         |        |
| [ ]  | SMK-08 | P0  | Seller home discovery/filter; open same request twice and reuse conversation. |                     |                         |        |
| [ ]  | SMK-09 | P0  | Seller AI offer with image, price, fulfillment; publish once.                 |                     |                         |        |
| [ ]  | SMK-10 | P0  | Edit offer and verify fulfillment/images/chat summary.                        |                     |                         |        |
| [ ]  | SMK-11 | P0  | Buyer accepts offer; sibling offers close.                                    |                     |                         |        |
| [ ]  | SMK-12 | P0  | Buyer and seller exchange moderated text and image.                           |                     |                         |        |
| [ ]  | SMK-13 | P0  | Seller concretar; shipping path through received/finalized.                   |                     |                         |        |
| [ ]  | SMK-14 | P0  | Pickup path through email OTP/finalized.                                      |                     |                         |        |
| [ ]  | SMK-15 | P0  | Both participants rate; summaries update.                                     |                     |                         |        |
| [ ]  | SMK-16 | P0  | Notification list, read/dismiss, deep-link destination.                       |                     |                         |        |
| [ ]  | SMK-17 | P0  | Critical push foreground/background/cold tap.                                 |                     |                         |        |
| [ ]  | SMK-18 | P0  | Profile picture valid/rejected replacement.                                   |                     |                         |        |
| [ ]  | SMK-19 | P0  | Business owner edits name/location/categories/team invitation.                |                     |                         |        |
| [ ]  | SMK-20 | P0  | Business verification submit/reviewer decision/state refresh.                 |                     |                         |        |
| [ ]  | SMK-21 | P0  | Report/block/unblock and verify interaction suppression.                      |                     |                         |        |
| [ ]  | SMK-22 | P0  | Cancel an eligible request and verify graph closure.                          |                     |                         |        |
| [ ]  | SMK-23 | P0  | Delete an eligible secondary profile with fresh reauth.                       |                     |                         |        |
| [ ]  | SMK-24 | P0  | Offline/reconnect during home, chat, and AI without duplicate.                |                     |                         |        |
| [ ]  | SMK-25 | P0  | Sign out; confirm private state and push registration are cleared.            |                     |                         |        |

Smoke result: **NOT RUN**<br>
Release build:<br>
Lead tester/sign-off/date:

## 20. Bug log

### Severity rules

| Severity | Definition                                                                                                 | Release treatment                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Blocker  | Cannot test or use the release/core app; data loss or deployment unavailable.                              | Must close before release.                                        |
| Critical | Security/privacy breach, cross-user data, irreversible corruption, auth/deletion bypass, widespread crash. | Must close before release and add regression evidence.            |
| Major    | Core role flow fails, duplicate transaction, stuck lifecycle, broken provider/notification path.           | Must close before release unless formally removed from MVP scope. |
| Minor    | Secondary behavior fails with safe workaround and no data/security impact.                                 | May defer with product owner approval.                            |
| Trivial  | Cosmetic/polish only.                                                                                      | May defer.                                                        |

Copy additional rows as needed. Never overwrite the original actual result after a fix. Severity recorded from manual testing is provisional until bug triage.

### Live remediation and retest queue — updated 2026-08-24

The discovery rows below intentionally preserve the tester's original result and original `Open` status. This table is the current remediation status; do not change a failed VITAL result to PASS until its manual retest passes.

| Bug | Current status | Implemented change | Rerun / proof required |
| --- | --- | --- | --- |
| BUG-001 | Retest passed | Seller email conflict now says the address is already in use and that each profile needs a different email. | Covered by the founder's successful VITAL-06 retest. |
| BUG-002 | Retest passed | Business verification identifies RNP as the SICOP Registro Nacional de Proveedores and explains the certification number/evidence. | Covered by the founder's successful VITAL-06/07 retest. |
| BUG-003 | Retest passed | The DB/seed now provides ten ordered MVP FAQs for both roles. | Covered by the founder's successful VITAL-10 retest. |
| BUG-004 | Retest passed | Detail screens now use a nested stack, preserving detail-to-detail Back history. | Covered by the founder's successful VITAL-10 navigation retest. |
| BUG-005 | Retest passed | Buyer AI disables send-on-return; the green send button remains the send action. | Covered by the founder's successful VITAL-11 retest. |
| BUG-006 | Retest passed | Failed/interrupted buyer-AI turns expose Retry and reuse the exact request identity; the Edge Function stores durable replay results and serializes concurrent retries. | Covered by the founder's successful VITAL-11 retest. |
| BUG-007 | Partial — iOS/web ready; Android association pending | Shares now use `https://luppit.com/request/{id}`; the app route, iOS association, and web fallback are implemented. | Rerun VITAL-17 in WhatsApp/browser and iOS. Before Android verification, publish `assetlinks.json` with the production signing SHA-256, then confirm the same URL opens the exact request. |
| BUG-008 | Retest passed | Seller offer assistant restores the latest owned active draft and its saved conversation; first-turn races reuse or safely reject a duplicate draft. | Covered by the functional VITAL-18 retest. |
| BUG-009 | Retest passed; UX follow-up BUG-019 | Seller drafts have a confirmed Discard action that soft-cancels the active draft. | Functional discard passed; placement and close-menu presentation moved to BUG-019. |
| BUG-010 | Retest passed | The counterpart business name in buyer chat is an accessible link to the existing seller-business screen. | Covered by the successful VITAL-21 retest. |
| BUG-011 | Retest passed | Seller chat links to a conversation-scoped buyer profile exposing only name, image, rating, and rating count. | Covered by the successful VITAL-21 retest. |
| BUG-012 | Reworked — ready for focused retest | The full stack now preserves the server `message_group_index`: retrieval orders logical group rows deterministically, chat renders text + images as one group, and realtime replaces optimistic positions by `(group_id,index)`. | Rerun the newly reported VITAL-23 scenario with text + three images on two live devices. Confirm one ordered group (text, then three-image mosaic), no split image, duplicate, orphan, or later reorder. |
| BUG-013 | Ready for retest | The first item in each real chat group creates exactly one in-app notification and one push; legacy offer/system messages do not create extra message notifications. | Rerun VITAL-23 with the recipient outside chat; confirm one active-profile notification/push opens the exact conversation and read/dismiss state updates once. |
| BUG-014 | Retest passed | Pickup status cards now use actor-specific next-step copy, DB-provided icons, and stronger visual hierarchy while shipping copy remains unchanged. | Covered by successful VITAL-25/31/32 retests. |
| BUG-015 | Retest passed | Buyer/seller rating chips now use role-specific marketplace feedback tags in migration and seed configuration. | Covered by the successful VITAL-28 retest. |
| BUG-016 | Reworked — ready for focused retest | Active buyer stages and seller Offers now exclude all finalized transactions. Profile exposes **Solicitudes finalizadas** for both roles with search, filters, and sort. Seller Offers is restored to one active list with no history toggle. | Finalize before rating, then before/after both ratings confirm it never appears on active Home/Offers, appears exactly once under Profile → Solicitudes finalizadas, can be filtered/sorted, and still opens its detail/chat after relaunch. Confirm rejected/canceled/discarded outcomes do not appear there. |
| BUG-017 | Retest passed | Authoritative profile refresh now applies the full profile-switch boundary and routes Home when the active profile disappears. | Covered by the successful VITAL-35 retest. |
| BUG-018 | Ready for retest | Unfinished Didit onboarding now has a confirmed Cancel action that clears only cancellable local verification state and returns to existing profiles or profile selection; automatic resume remains unchanged. | Start Didit, close it before completion, force-close/reopen, verify **Continúa tu verificación** still appears, cancel once at the confirmation and then confirm cancellation; verify the forced route clears, relaunch stays clear, a later attempt can start normally, and `IN_REVIEW` exposes no cancel action. |
| BUG-019 | Ready for retest | Removed the transcript-level discard button. X/back now offers exactly **Salir** (preserves draft) or **Descartar** (soft-cancels safely). | Start a draft, tap X, choose **Salir**, reopen and confirm restoration. Repeat, choose **Descartar**, reopen and confirm the draft is gone. Confirm no standalone discard button remains in the transcript. |
| BUG-020 | Ready for visual retest | Notifications now use the shared grouped-list and rounded-surface patterns; read dots/semantic icons and all navigation/read/dismiss behavior are preserved. | Open populated, empty, loading, and error states. Confirm visual consistency with Profile/Help, one short destructive management action, correct active-profile unread count, and unchanged tap/read/dismiss behavior. |

| Bug ID  | Section / test IDs    | Title                                                       | Severity | Status | Owner | Reported date/build | Platform/profile | Steps to reproduce                                                                       | Expected                                                                                            | Actual                                                                                          | Evidence             | Workaround                                              | Fix/PR | Retest date/build | Retest result/evidence | Notes                                                 |
| ------- | --------------------- | ----------------------------------------------------------- | -------- | ------ | ----- | ------------------- | ---------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------- | ------ | ----------------- | ---------------------- | ----------------------------------------------------- |
| BUG-001 | Phase 1A.1 / VITAL-06 | Seller email conflict message is unclear                    | Minor    | Open   |       | Not recorded        | Seller           | During seller setup, enter the email already used by the buyer profile.                  | Explain clearly that the email is already in use and whether a separate business email is required. | The message does not clearly explain the conflict or the business-email expectation.            | VITAL-06 observation | Use a different email after recognizing the conflict.   |        |                   |                        | Preserve tester's original result: VITAL-06 passed.   |
| BUG-002 | Phase 1A.1 / VITAL-06 | RNP field lacks an explanation                              | Minor    | Open   |       | Not recorded        | Seller           | Open business verification and review the RNP input and supporting copy.                 | A short hint explains what RNP means and what the seller should enter or attach.                    | A person unfamiliar with RNP receives no helpful explanation.                                   | VITAL-06 observation | Ask for guidance outside the app.                       |        |                   |                        | Product-copy improvement found during a passing test. |
| BUG-003 | Phase 1A.1 / VITAL-10 | Help section needs more useful questions                    | Minor    | Open   |       | Not recorded        | Buyer and seller | Open Profile → Help and review the available questions.                                  | Help covers the common questions needed to use the MVP.                                             | The section works but does not yet contain enough useful questions.                             | VITAL-10 observation | Use external support.                                   |        |                   |                        | Content improvement found during a passing test.      |
| BUG-004 | Phase 1A.1 / VITAL-10 | Business Settings Back returns to Home                      | Minor    | Open   |       | Not recorded        | Seller           | Open Settings → Business Settings, then press Back.                                      | Back returns to Settings.                                                                           | Back returns to Home.                                                                           | VITAL-10 observation | Reopen Settings from Profile.                           |        |                   |                        |                                                       |
| BUG-005 | Phase 1A.1 / VITAL-11 | Keyboard return key sends instead of inserting a line break | Minor    | Open   |       | Not recorded        | Buyer AI         | Write a multi-line buyer request and press the keyboard's bottom-right return/arrow key. | Return inserts a line break; only the green send button submits the message.                        | The keyboard key submits the message, preventing the intended line break.                       | VITAL-11 observation | Compose a single-line message and use the green button. |        |                   |                        | Part of the tester's partially correct result.        |
| BUG-006 | Phase 1A.1 / VITAL-11 | Backgrounding interrupts AI request without resend          | Major    | Open   |       | Not recorded        | Buyer AI         | Send an AI request, switch to another app before completion, then return.                | The request recovers or the interrupted message provides a visible resend action beside Copy/Share. | The AI request is cut off and the message has no resend action.                                 | VITAL-11 observation | Manually send the request again.                        |        |                   |                        | Part of the tester's partially correct result.        |
| BUG-007 | Phase 1A.1 / VITAL-17 | Shared request is not a clickable deep link                 | Minor    | Open   |       | Not recorded        | Request sharing  | Share a request to WhatsApp or another app and inspect/tap the resulting message.        | The shared message contains a tappable link that opens the correct request in Luppit.               | A message is shared, but it is not treated as a clickable link; app opening remains unverified. | VITAL-17 observation | Find and open the request manually in Luppit.           |        |                   |                        | Preserve tester's original result: VITAL-17 passed.   |
| BUG-008 | Phase 1A.1 / VITAL-18 | Offer-draft messages are not restored                       | Major    | Open   |       | Not recorded        | Seller AI        | Start an offer draft, exchange several messages, leave the assistant, then reopen it.    | The existing draft and its messages load automatically so the seller can continue.                  | Messages exist in `offer_draft_message` but are not loaded when the seller returns.             | VITAL-18 observation | Re-enter the offer details.                             |        |                   |                        | Part of the tester's partially correct result.        |
| BUG-009 | Phase 1A.1 / VITAL-18 | Offer draft has no discard action                           | Minor    | Open   |       | Not recorded        | Seller AI        | Start an offer draft and look for a way to abandon/delete it.                            | A clear discard action removes or closes the unwanted draft safely.                                 | No option to discard the draft is available.                                                    | VITAL-18 observation | Leave the unused draft in place.                        |        |                   |                        | Part of the tester's partially correct result.        |
| BUG-010 | Phase 1A.2 / VITAL-21 | Business name in conversation is not interactive | Minor | Open | | Not recorded | Buyer | As buyer, open an offer conversation and tap the business name displayed above a message. | The visible business name opens the seller's business profile. | Nothing happens; the buyer must discover **Mostrar negocio** in the three-dot menu. | VITAL-21 observation | Use the three-dot menu → **Mostrar negocio**. | | | | Part of the tester's partially correct result. |
| BUG-011 | Phase 1A.2 / VITAL-21 | Seller cannot open buyer profile for evaluation | Minor | Open | | Not recorded | Seller | As seller, open the buyer conversation and try to reach the buyer's profile. | An intentional buyer-profile entry point exposes the safe information needed to evaluate the counterparty. | No buyer-profile entry point is available to the seller. | VITAL-21 observation | Continue using only the conversation context. | | | | Confirm intended MVP visibility during triage. |
| BUG-012 | Phase 1A.2 / VITAL-22 | Multi-image message causes unstable duplicates and layout changes | Major | Open | | Not recorded | Buyer/seller chat | Send one message containing text and three images while both participants have the conversation open. | One stable logical message appears once; images remain in the intended carousel/layout; validation occurs predictably. | The message duplicates, images switch into a carousel and then separate, the duplicate later disappears, and a maximum-size error appears. | VITAL-22 observation | Send fewer images separately until fixed. | | | | Part of the tester's partially correct result. |
| BUG-013 | Phase 1A.2 / VITAL-23 | Chat messages do not create notifications | Major | Open | | Not recorded | Buyer/seller notifications | Leave one participant outside the conversation and send a message from the other participant. Open Notifications. | The recipient receives one active-profile message notification that opens the conversation. | The notification center works, but actual sent messages do not trigger notification rows. | VITAL-23 observation | Check Chats manually for new messages. | | | | Notification-center behavior itself passed. |
| BUG-014 | Phase 1A.2 / VITAL-25 | “Retiro pendiente” status card needs clearer design | Minor | Open | | Not recorded | Pickup conversation | Concretar a pickup transaction and inspect the resulting **Retiro pendiente** card. | The card's copy, hierarchy, and structure clearly explain the state and next action. | The card works functionally but its messages and visual structure are confusing. | VITAL-25 observation | Follow the available action despite the unclear presentation. | | | | Visual/content improvement found during a passing test. |
| BUG-015 | Phase 1A.2 / VITAL-28 | Rating-tag chips are not useful enough | Minor | Open | | Not recorded | Buyer/seller ratings | Complete a rating from both roles and review the available tag chips. | Tags are meaningful enough to capture useful marketplace feedback and are present in seed/configuration data. | Current database-configured categories are not useful enough. | VITAL-28 observation | Submit the rating using the closest available tags. | | | | Revise the DB configuration and seed data during remediation. |
| BUG-016 | Phase 1A.2 / VITAL-29 | Finalized items clutter active Home and Offers surfaces | Minor | Open | | Not recorded | Buyer and seller | Finalize transactions, then reopen buyer Home and seller Home/Offers. | Active surfaces prioritize actionable work; finalized history appears in a separate completed area. | Finalized requests/offers remain mixed with current active items for both roles. | VITAL-29 observation | Use status filters where available. | | | | Product organization improvement found during a passing persistence test. |
| BUG-017 | Phase 1A.2 / VITAL-35 | Profile deletion leaves a stale role screen | Minor | Open | | Not recorded | Dual-profile account | Delete the active seller profile while a buyer profile remains. | The buyer becomes active and the app reloads/navigates to buyer Home immediately. | The profile switches to buyer, but the page does not reload, leaving a confusing stale screen. | VITAL-35 observation | Navigate Home manually or relaunch the app. | | | | Functional deletion itself passed. |
| BUG-018 | Phase 1A.1 / VITAL-03 | Interrupted Didit verification has no cancellation escape | Major | Open | | Not recorded | Buyer/seller onboarding | Start Didit, close the provider flow before completion, then force-close and reopen Luppit. | The app resumes the unfinished verification, while also offering a confirmed way to cancel it and return to profile selection or existing profiles. | Resume works correctly, but **Continúa tu verificación** is a forced route with no way to cancel or leave it. | Founder report after Phase 1A | Complete the verification. | | | | Preserve automatic resume behavior; cancellation must not remove the phone account, existing profiles, or pending invitations. |
| BUG-019 | Phase 1A.1 / VITAL-18 | Offer-draft discard action is placed in the transcript | Minor | Open | | 2026-08-24 | Seller AI | Start or restore an offer draft and inspect the transcript, then tap X. | The transcript stays focused on the assistant; X offers the short choices **Salir** or **Descartar**. | **Descartar borrador** is always visible in the transcript and makes the screen look cluttered. | Founder VITAL-18 retest | Leave the draft without discarding it. | | | | Functional draft restore/discard already works. |
| BUG-020 | Phase 1A.2 / VITAL-23 | Notification center does not follow shared app style | Minor | Open | | 2026-08-24 | Buyer/seller notifications | Open Notifications with populated, empty, and management states. | The feed, empty/error states, and actions use the same calm grouped-list and surface language as Profile/Help. | The screen feels visually inconsistent and substantially worse than surrounding app screens. | Founder visual review | Notification behavior remains usable. | | | | Redesign must preserve active-profile read/dismiss/navigation semantics. |

## 21. Section roll-up and risk acceptances

Complete this only from the detailed cases. Do not estimate counts.

| Section                                        | Total applicable | Pass | Fail | Blocked | N/A | Open Blocker/Critical | Open Major | Status                                  | Owner/date |
| ---------------------------------------------- | ---------------: | ---: | ---: | ------: | --: | --------------------: | ---------: | --------------------------------------- | ---------- |
| **Phase 1A.1 onboarding through offer draft**  |           **18** |   17 |    0 |         |     |                     0 |          1 | **IN PROGRESS — 1 result not recorded** |            |
| **Phase 1A.2 offer through deletion**          |           **19** |   18 |    1 |         |     |                     0 |          2 | **TESTED — RETESTS OPEN**                |            |
| **Phase 1B accounts/profiles/screens/queries** |           **18** |      |      |         |     |                       |            | **NOT TESTED**                          |            |
| **Phase 1B conversation/request states**       |           **12** |      |      |         |     |                       |            | **NOT TESTED**                          |            |
| **Phase 1 total / gate**                       |           **67** |   35 |    1 |         |     |                     0 |          3 | **STOP — IN PROGRESS**                  |            |
| Preflight/build/runtime                        |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| Bootstrap/auth/identity                        |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| Profiles/navigation                            |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| Home/discovery/lists                           |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| Buyer requests                                 |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| Seller offers                                  |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| Conversations/fulfillment                      |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| Notifications/push                             |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| Account/business/safety/deletion               |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| Help/legal/accessibility/resilience            |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| Database                                       |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| Edge/providers                                 |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| External/race/restore/operations               |                  |      |      |         |     |                       |            | NOT TESTED                              |            |
| Automated coverage                             |                  |      |      |         |     |                       |            | INCOMPLETE                              |            |
| iOS smoke                                      |               25 |      |      |         |     |                       |            | NOT RUN                                 |            |
| Android smoke                                  |               25 |      |      |         |     |                       |            | NOT RUN                                 |            |

Use this table only for genuine business risk acceptance, not as a way to hide a failed P0.

| Risk / deferred item                                   | Why acceptable for MVP                     | User impact                         | Security/privacy/data impact | Mitigation/workaround       | Accountable owner | Expiry / follow-up | Approval/date |
| ------------------------------------------------------ | ------------------------------------------ | ----------------------------------- | ---------------------------- | --------------------------- | ----------------- | ------------------ | ------------- |
| No separate staging environment                        |                                            |                                     |                              |                             |                   |                    |               |
| Push removed from MVP or deployment incomplete         |                                            |                                     |                              |                             |                   |                    |               |
| No application-operated backup/restore                 |                                            |                                     |                              |                             |                   |                    |               |
| Deletion completion/support-alert delivery unavailable |                                            |                                     |                              |                             |                   |                    |               |
| Payment processing explicitly out of MVP               | No checkout/capture/escrow is implemented. | Transactions settle outside Luppit. |                              | Make product copy explicit. |                   |                    |               |
| Other                                                  |                                            |                                     |                              |                             |                   |                    |               |

## 22. Final MVP decision

### Final evidence checklist

- [ ] Release header and device matrix complete.
- [ ] Phase 1 gate is `PASS — CONTINUE TO PHASE 2`, including shipping, pickup, ratings, and deletion evidence.
- [ ] All P0 and applicable P1 cases have results.
- [ ] All section summaries reconcile with detailed rows.
- [ ] Bug log contains every failure and retest history.
- [ ] CI/app/Edge/DB evidence is tied to exact clean release commits.
- [ ] Live migrations/functions/cron/buckets/config match intended release.
- [ ] Staging provider, race, Realtime, Storage, cron/Vault, and deletion evidence attached.
- [ ] Physical iOS and Android smoke pass.
- [ ] Legal publication/checksum verified.
- [ ] Backup/restore and deletion-ledger replay proven or risk accepted by accountable owner.
- [ ] Sentry/log/privacy review complete.
- [ ] Product scope explicitly says payment is not provided by the MVP.

### Decision record

| Field                       | Entry                                                  |
| --------------------------- | ------------------------------------------------------ |
| Decision                    | NOT READY / MVP READY / GO WITH ACCEPTED RISKS / NO-GO |
| Release/build/commits       |                                                        |
| Phase 1 functional decision |                                                        |
| P0 result                   |                                                        |
| P1 pass rate                |                                                        |
| Open blocker/critical bugs  |                                                        |
| Open major bugs             |                                                        |
| Accepted risks              |                                                        |
| Product owner               |                                                        |
| Technical owner             |                                                        |
| Security/privacy reviewer   |                                                        |
| Operations owner            |                                                        |
| Decision date/time          |                                                        |
| Evidence folder             |                                                        |
| Final notes                 |                                                        |

The preparation baseline is **NOT READY** because Phase 1 has not been run, the full Phase 2 suite is incomplete, no separate staging environment is available, and local push implementation is not in live deployment/runtime parity. First earn the Phase 1 functional pass; change the final decision only after the remaining release evidence and approvals are also complete.

## 23. Traceability appendix

### Application

- Routes/screens: `app/`
- Services/RPC clients: `src/services/`
- Supabase integration: `src/lib/supabase/`
- Generated DB types: `src/types/database.types.ts`
- Conversation/shared UI: `src/components/conversation/`, `src/components/inputChat/`, `src/components/popup/`
- Existing app tests: `tests/*.test.mts`

### Database repository

- Repository: `../luppit-supabase`
- Migrations: `../luppit-supabase/supabase/migrations/`
- pgTAP: `../luppit-supabase/supabase/tests/database/`
- Runtime verification: `../luppit-supabase/scripts/verify-runtime.sql`
- Deletion runbook: `../luppit-supabase/docs/legal-account-deletion-runbook.md`
- Manual business verification: `../luppit-supabase/docs/manual-business-verification.md`

### Edge Functions

- Repository: `ai-edge-functions/`
- Deployable functions: `ai-edge-functions/supabase/functions/`
- Function config: `ai-edge-functions/supabase/config.toml`
- Testing/inventory/production gate: `ai-edge-functions/docs/`
- Smoke/benchmark helpers: `ai-edge-functions/scripts/`

### Live Supabase snapshot used during preparation

- Project: `LuppitDB` / `mesycgfytnbxpikcuqmb`
- Status: `ACTIVE_HEALTHY`
- Live migration count: 52; local repository count: 53
- Live Edge Functions: 15 active; local intended directories: 16
- Live cron jobs: 7 active; repository-required: 8
- Storage buckets: 8
- App catalogs observed: roles `BUYER`/`SELLER`; 5 active segments; 3 request statuses; 12 conversation statuses; 4 message kinds; 3 notification types
- Live access inventory observed: 105 policies across 73 public/storage tables; 267 public functions and 71 private functions
