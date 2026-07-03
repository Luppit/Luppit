# AGENTS.md

## Scope
Applies to purchase-request detail screens, selected-offer timeline behavior, and account-setting detail screens.

## Purchase Request Detail
- Detail routes must work from grouped buyer-home RPC items even when serialized params contain only UI-required request fields.
- Use raw `purchase_request.status` for detail logic; grouped card `status_label` is presentation copy only.
- Visualization counts, buyer offer lists, accepted-offer resolution, and selected-offer timeline must be DB-backed.
- `active` requests render active offers from `public.get_buyer_purchase_request_offers(...)`; `offer_accepted` renders only the accepted offer and label `Oferta seleccionada`.
- Offer timeline comes from `public.get_conversation_timeline(...)`; render row `label`, `icon`, `reached_at_label`, `is_next`, `is_completed`, and `pre_label` directly.
- Seller reputation on offer cards comes from DB-backed rating views/summaries, not legacy `business.rating` fields.
- Purchase-offer overflow menus must not expose request favorite actions; request favorite state/actions belong to the detail ellipsis and role-specific favorite RPCs.
- Unknown timeline icons may fall back safely, but do not hardcode timeline ordering or pending text when DB metadata exists.

## Account Details
- Detail help/settings/profile-adjacent surfaces should follow the soft grouped-list style in `src/components/AGENTS.md`.
- Account-setting detail routes are not purchase-request details; hide the purchase-request ellipsis/menu.
- `/(detail)/account-settings` loads profile/account fields through `profile.service.ts` and resolves role itself because tab role context may be unavailable.
- `/(detail)/notifications` uses the shared detail top bar with `hideMenu=true`, loads through `notification.service.ts`, marks loaded unread notifications read through the service RPC on open, and shows full message text through the shared popup.
- `/(detail)/home-preset` loads active preset metadata for the current surface, previews DB group names/order/max-items locally, and saves through `profile_home_group_preset` only on `Guardar cambios`.
- `/(detail)/business-profile` resolves seller business data through `profile_business`, reads location from `business.location_id -> location`, shows rating from `business_rating_summary`, and edits category preferences through `set_current_business_category_preferences`.
- Business location editing belongs in `/(modal)/business-location-edit`, uses active `location` rows, and saves only a valid district `location.id` through `set_current_business_location`.
