# AGENTS.md

## Scope
Applies to purchase-request detail screens and selected-offer timeline behavior.

## Purchase Request Detail: DB-Driven Contract (Mandatory)
- Purchase-request detail may be opened from grouped buyer-home RPC items; the route must continue to work when the incoming serialized `purchaseRequest` payload contains the UI-required purchase-request fields but not extra enrichment.
- Grouped home payloads may now include `status_label` for card presentation, but detail-screen logic must continue using raw `purchase_request.status`.
- `purchase_request.status` controls offer list mode:
  - `active`: render all offers and the count label (`Ofertas (n)`).
  - `offer_accepted`: render only the accepted offer and label `Oferta seleccionada`.
- Accepted offer resolution must come from DB-backed conversation data (acceptance transition), not local heuristics.
- Offer timeline must come from `public.get_conversation_timeline(...)`.
- Seller reputation shown on offer cards must come from the DB-backed rating view/summary relation (`business_with_rating` or equivalent), not from removed `business.rating` / `business.num_ratings` columns.
- UI must consume timeline row metadata directly:
  - `label`
  - `icon`
  - `reached_at_label`
  - `is_next`
  - `is_completed`
  - `pre_label`

## Implementation Rules
- Do not hardcode conversation-state ordering in client code when timeline RPC exists.
- Do not hardcode pending prefix text when `pre_label` is provided by DB.
- If icon key is unknown, apply safe icon fallback (`circle-help`) without breaking render.
- Timeline styling is presentation-only; product logic (which steps exist, completion, next step) is DB-resolved.
