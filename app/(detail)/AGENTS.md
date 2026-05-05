# AGENTS.md

## Scope
Applies to purchase-request detail screens, selected-offer timeline behavior, and account-setting detail screens.

## Purchase Request Detail: DB-Driven Contract (Mandatory)
- Purchase-request detail may be opened from grouped buyer-home RPC items; the route must continue to work when the incoming serialized `purchaseRequest` payload contains the UI-required purchase-request fields but not extra enrichment.
- Grouped home payloads may now include `status_label` for card presentation, but detail-screen logic must continue using raw `purchase_request.status`.
- Purchase-request detail visualization count must reflect `purchase_request_visualization` rows for that request; do not infer it from stale card params or local counters.
- `purchase_request.status` controls offer list mode:
  - `active`: render all offers and the count label (`Ofertas (n)`).
  - `offer_accepted`: render only the accepted offer and label `Oferta seleccionada`.
- Accepted offer resolution must come from DB-backed conversation data (acceptance transition), not local heuristics.
- Offer timeline must come from `public.get_conversation_timeline(...)`.
- Seller reputation shown on offer cards must come from the DB-backed rating view/summary relation (`business_with_rating` or equivalent), not from removed `business.rating` / `business.num_ratings` columns.
- Buyer purchase-request detail ellipsis favorite state must come from buyer favorite RPC state, not from route params or local-only assumptions.
- The detail ellipsis favorite option must toggle copy/icon by current state:
  - not favorited: `Añadir como favorito` with `star`
  - favorited: `Quitar de favoritos` with `star-off`
- Detail favorite actions must call the buyer add/remove favorite RPC wrappers and update local presentation only after the RPC result.
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

## Account Settings Detail Screens
- Account settings detail routes are not purchase-request detail routes; hide the purchase-request ellipsis/menu on these routes.
- `/(detail)/account-settings` should display profile/account fields from `profile.service.ts` and route edits to dedicated flows.
- `/(detail)/home-preset` is the buyer/seller home preset chooser:
  - load options from active preset metadata for the current surface (`buyer_home` or `seller_home`)
  - render a visual blueprint from DB group names/order/max-items
  - keep selection local until the user taps `Guardar cambios`
  - save through the profile service upsert into `profile_home_group_preset`.
- Do not make preset preview destructive by temporarily changing the user's actual assignment.
