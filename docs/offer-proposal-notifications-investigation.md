# Seller proposal notification investigation

Task 7 from the September 21, 2026 `main fixes 2` batch. Investigation and local
validation completed September 22 UTC on `codex/offer-proposal-notifications`.

## Finding

The missing backend event could not be reproduced. Proposal submission already
creates a buyer notification and a push delivery through the existing pipeline.
Do not add another submission trigger or a client-side notification write: that
would duplicate an existing event. The reported buyer-visible issue remains open
until its surface and device state are identified.

Read-only hosted checks found four submitted proposals: three pending and one
accepted. All four had exactly one pending-proposal notification linked to their
conversation buyer, and all four notification assignments were still unread.
Four `offer_change_pending` push deliveries were in `accepted` status. Push mode
was `all`. These are delivery-pipeline facts, not proof that a device displayed
a banner or that the user saw the in-app list or badge. No hosted writes or test
notifications were performed.

## Existing event path

1. The app sends edit-mode `PUBLISH` with the reviewed draft version and offer
   revision to `ai-vendedor-completar`.
2. The deployed Edge handler calls `publish_seller_offer_revision` as the user.
   The RPC checks ownership and version, locks the conversation/draft, snapshots
   an immutable pending proposal, marks the draft sent, and calls
   `private.offer_proposal_event` in the same transaction. It does not change the
   current offer. Sent-draft retries return the committed result.
3. `offer_proposal_event` posts grouped conversation content and calls
   `private.create_profile_notification` for `conversation.buyer_profile_id`.
   The event is `offer_proposal_pending`; the dedupe key is
   `offer_proposal:<proposal-id>:pending`. The `action_needed` notification says
   the seller proposed changes and asks the buyer to review before deciding.
4. Inserting `profile_notification` invokes
   `private.enqueue_profile_notification_push`, which uses the existing
   `offer_change_pending` policy and one deduplicated outbox row per enabled
   buyer device. The channel is `critical_updates`. Generic lock-screen copy
   does not include offer terms. Rollout mode, test allowlisting and device
   opt-out remain authoritative. Proposal text/photos have group positions above
   zero, so the grouped-message triggers emit no extra message notifications.
5. `process-push-notifications` claims leased deliveries, records Expo tickets
   and receipts, retries transient failures, and disables invalid devices.
   Both in-app navigation and push data point to `/(conversation)/offer` with
   `conversationId`. Push data also includes the recipient profile and
   notification ID for the existing profile-switch/read flow.

## Local validation

Added a standalone transactional pgTAP suite in the separate database worktree:
`supabase/tests/database/offer_proposal_notifications.test.sql` (44 assertions).
It covers draft silence, unauthorized/stale submission, rollback on outbox
failure, buyer-only recipients, in-app navigation and unread state, current-offer
validity, iOS/Android device records, disabled devices, rollout preferences,
leased/retried deliveries, invalid tokens, successful receipts, rejection,
withdrawal and cancellation. All outbound worker invocation is stubbed inside
the test transaction.

Passed:

- New proposal-notification suite: 44 assertions.
- Existing offer revision suite: 64 assertions.
- Existing notification read-management suite: 32 assertions.
- Existing Edge push worker tests: 4 tests, with Deno type checking and mocked
  transport.
- App push routing/onboarding tests: 7 tests.
- Git whitespace/diff checks in both changed repositories.

Database suites ran with `psql -v ON_ERROR_STOP=1` in a disposable local database
cloned from an empty Supabase fixture database with zero Auth users and zero
Vault secrets. The fixture clone lacked a current Realtime message partition;
adding a default partition only in this disposable database allowed the existing
broadcast assertion to pass. Test transactions rolled back. The new suite can
also be run through the repository's documented `supabase test db` command.

No TypeScript application code changed, so application-wide TypeScript/ESLint
checks were not needed. No iOS/Android device UI, native push delivery,
PostgREST-to-Edge request, or live Realtime client was exercised.

## Integration and remaining reproduction

- Application base: `1fce86f`; database base: `813a635`. Both task branches are
  `codex/offer-proposal-notifications`.
- Database worktree: `/private/tmp/luppit-proposal-notifications-db`.
- Changes are regression tests and documentation only. There is no migration,
  schema/API change, generated-type change, or notifications UI/read-action edit.
  Task 8 retains those UI/read-action files.
- The canonical Edge checkout at `89b3ec7` predates the deployed edit-mode
  handler and lacks `offerRevision.ts`. The deployed source was inspected
  read-only to establish the actual RPC path. Reconcile Edge source history
  before any future deployment; do not deploy the stale checkout over that code.
- Reproduce with the buyer's exact surface: OS banner, in-app notification list,
  profile badge, or open conversation. Check active profile and OS permission;
  open-conversation foreground banner suppression is intentional, and the
  profile badge also refreshes on received push/app return and a 60-second poll.
  These are diagnostic branches, not established causes.

No branch was merged or pushed, no release build was generated, and no deployed
runtime or production data was modified.
