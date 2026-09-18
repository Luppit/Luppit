# Buyer-approved offer changes

The seller opens **Modificar**, prepares a private AI draft, reviews it, and taps **Proponer cambios**. Submitting leaves the current offer unchanged until the buyer explicitly approves. Rejection or withdrawal preserves the existing agreement. Offer and conversation IDs remain the same.

## Lifecycle

| State | Seller can propose | Effect of buyer approval |
| --- | --- | --- |
| OFFER_MADE | Yes | Apply proposed terms and accept the purchase with explicit delivery selection. |
| OFFER_ACCEPTED | Yes | Amend the agreement; keep the current stage. |
| SELLER_ACCEPTED | Yes | Amend the agreement; preserve confirmation and deadline. |
| DELAYED_ACCEPTANCE | Yes | Amend the agreement; preserve overdue status and cancellation rights. |
| Shipment, validated pickup, cancellation, terminal states | No | Pending proposals close; agreed history remains. |

Eligibility also requires profile ownership, seller marketplace access, current legal acceptance, an eligible request and no interaction block. Only one pending proposal is allowed per conversation; withdraw before replacement. Before first acceptance, the buyer may accept the original offer, making a competing proposal obsolete.

## Contracts

- Edge requests use `mode: create | edit`, defaulting to creation. `RESTORE` begins/resumes without a model call. Private transcripts stay in `offer_draft_message`.
- Draft saves use `draft_version` and `base_offer_revision`. Submission applies exactly the reviewed version. Stale saves fail; late AI responses cannot reopen sent/discarded drafts. Leaving retains the draft; **Descartar** closes only the draft.
- `publish_seller_offer_revision` now submits an immutable `offer_change_proposal` and records `submitted_proposal_id` on the sent draft. Retries reuse the committed result. The older direct-update path cannot bypass buyer consent.
- `resolve_offer_change_proposal` checks actor, action metadata, proposal identity, offer revision and a review token including stage and selected delivery. Proposal and agreement tables have RLS and no direct client/service-role grants; authorized RPCs expose participant-safe data.
- Approval atomically applies UNIT/TOTAL pricing, quantity, currency, canonical description/conditions, fulfillment and photos. Immutable `offer_agreement_revision` snapshots record accepted versions. Initial purchase-acceptance side effects run once.
- Delivery selection carries forward unless affected, then requires explicit buyer selection. Shipping cost remains optional. Pickup availability stays anchored to original seller confirmation. Operational deadlines never restart. Approval invalidates unconsumed pickup codes.
- Transactions lock request, sibling conversations, offer, then draft/proposal. Stale acceptance/review and conflicting lifecycle actions fail safely. No automatic merge or publication occurs.
- The offer revision includes deterministic current photo paths. Buyer review shows labelled current/proposed photos with signed references; missing photos block approval. Removing a current photo preserves historical attachments.
- Submission/decisions broadcast both `view` and `messages`, append grouped public summaries/photos, and create one recipient notification. Pending proposals do not replace the header price. Existing focus services refresh listings.
- Seller cancellation preserves proposal-bearing conversations/history, unlinks the cancelled offer and excludes retained offers from listings. Ordinary cancellation is preserved for conversations without proposal history.

## Presentation

The existing editor, composer, disclosures and shared popup are reused. The draft card reads **Oferta actual** until edited, then **Cambios propuestos**. Review shows complete proposed terms and changed fields. Buyer review shows current/proposed terms/photos and unchanged deadline policy.

Popup buttons retain the standard horizontal layout and styles. Exit uses **Salir** and **Descartar**; approval uses **Volver** and **Aceptar**. No new payment, refund, deposit, warranty or post-shipment workflow is introduced.

## Deployment and rollback

The initial direct-update implementation (migrations `20260917060718`, `20260917061013`, Edge v74) is superseded by `20260918005034_buyer_approved_offer_proposals.sql` and seller Edge v75. Both were deployed, database first, to the user-authorized test project `mesycgfytnbxpikcuqmb` on 2026-09-18 UTC / September 17 Costa Rica. JWT verification remains enabled. Local migration history matches the hosted timestamp. App changes are on canonical local main. No hosted seed/reset or Git remote push was performed; no older-build gate is required.

Rollback disables the two seller edit actions across all states while retaining proposal/agreement data. Buyers can still resolve existing proposals:

```sql
update public.conversation_status_role_action rule
set is_enabled = false
from public.conversation_action action, public.role actor
where action.id = rule.action_id and actor.id = rule.role_id
  and actor.role_code = 'SELLER'
  and action.code in ('SELLER_MODIFY_OFFER', 'SELLER_MODIFY_OFFER_MENU');
```

## Verification

- App: 247 unit tests, TypeScript, changed-file ESLint and diff checks passed.
- Edge: 116 seller/shared Deno tests passed with type checking.
- Database: 1,313 pgTAP assertions across all 45 files passed on local Supabase, including 64 proposal assertions. Fixtures roll back; the test helper avoids the managed GraphQL `resolve` hook.
- Eleven real concurrent scenarios passed: submission/acceptance both orders, GET-to-PUBLISH retry, competing draft saves, approval/rejection, approval/seller confirmation, approval/dispatch both orders, duplicate approval, withdrawal/approval, and approved proposal/stale original acceptance.
- iOS and Android Hermes exports passed. Exports prove bundling, not device interaction.
- Hosted readback confirmed the four action stages, RLS and absence of direct proposal/agreement table grants. Existing advisor categories remain; the authenticated resolver is an intentional SECURITY DEFINER entrypoint with internal checks.

Run app unit tests, TypeScript, changed-file ESLint and diff checks. Run seller and `_shared` Deno tests in `ai-edge-functions`. Run pgTAP and `python3 supabase/tests/concurrency/offer_ai_revisions.py` in sibling `luppit-supabase`. The concurrency runner clones/drops a disposable local database and never resets the source or connects to hosted data.

## Hosted QA fixtures

The buyer and verified **Negocio Demo Luppit S.A.** seller profiles belong to the same test account. Existing user offers were preserved. New fixture titles begin **QA · Cambios de oferta ·** and request contracts carry `qa_offer_proposals: true` for precise future cleanup. Initial terms: four tires at ₡40,000 each, shipping or pickup and an existing real tire photo.

| Initial title suffix | Conversation ID |
| --- | --- |
| OFFER_MADE | 779fb088-1bde-42f9-b7ab-4ae198efba46 |
| OFFER_ACCEPTED | f30ffa00-7252-4ae2-865e-fc65cc8e5aab |
| SELLER_ACCEPTED | 87295d37-cc09-4603-9e2d-ca5e2a9be69c |
| DELAYED_ACCEPTANCE | 4e8f7120-6aa7-471e-b153-bc998d5f28f3 |

Titles describe initial stages; actual status may advance during testing. Android interaction and OS push receipt require separate device validation.

## Live validation record

On iPhone 17 Pro / iOS 26.5, the authenticated seller restored the QA OFFER_MADE draft from the deployed function, changed unit price to ₡35,000 and added free balancing through the live AI, reviewed preserved quantity/photo/delivery and changed terms, then submitted with **Proponer cambios**. The success screen correctly stated that buyer approval is required. Hosted readback confirmed a pending proposal, current price still ₡40,000, proposed price ₡35,000 and exactly one buyer notification. The proposal is left pending for further UI testing.

Role-authenticated hosted RPC smoke tests, rolled back afterward, verified approval in all four stages. Initial approval required explicit delivery selection and produced OFFER_ACCEPTED; later approvals preserved stage and the entire deadline record. Retry results and notification counts were stable; public history did not contain the private AI prompt. These are database execution checks, not mobile interaction evidence.

All 14 deployed seller function files exactly match the local source. Native buyer approval/photo comparison, cross-device websocket refresh and notification navigation remain unverified: the Mac locked after seller submission and automatic unlock failed. An unlock was requested; no lock bypass was attempted. Android interaction and OS push receipt remain separate device checks. The simulator also displayed an existing profile-switch navigation warning during QA; this change does not alter that navigation path.
