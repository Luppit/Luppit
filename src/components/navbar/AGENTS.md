# AGENTS.md

## Scope
Applies to navbar UI components and rendering behavior.

## Navbar: DB-Driven Contract (Mandatory)
- Bottom navbar items must be loaded from DB using the authenticated user profile, not hardcoded arrays in client code.
- Role resolution for navbar must come from `profile_role -> role` in DB.
- Menu definitions must come from `menu_item` and role assignment/order from `role_menu`.
- Runtime fetch must use RPC `public.get_navbar_items_by_profile(p_profile_id uuid)`.
- The client must render returned `label`, `route`, `icon`, and `sort_order` directly from RPC payload.
- If RPC returns unknown icon keys, the client may omit icon rendering safely; it must not replace business behavior with hardcoded per-role menus.
- No hardcoded buyer/seller navbar fallback is allowed.

## Top Navbar Segments: DB-Driven Contract (Mandatory)
- Top horizontal segment chips (buyer and seller home) must be loaded from DB table `segment`.
- Segment labels must render from `segment.name`.
- Segment icon identity must render from `segment.svg_name`, resolved against bundled assets at `assets/segments/{svg_name}.svg`.
- `segment.is_disabled=true` must render segment as disabled (greyed out) and non-clickable.
- No hardcoded segment list fallback is allowed.
- Segment chips are separate DB configuration from home-group presets; do not infer seller/buyer home grouping or request filtering from segment values unless a DB-backed contract explicitly adds that behavior.
- Home request-card status labels are also DB-driven, but they come from the home RPC item payload (`status_label`), not from `segment` data.
- The large home search control is a visual trigger, not a free-typing search field, on buyer/seller home routes.
- Current home trigger behavior:
  - buyer: opens a `Filtros` popup for buyer-home filtering
  - seller: opens an empty/placeholder filters popup until seller-specific filters are defined
- Buyer filter popup content should follow existing popup/theme patterns and currently includes:
  - request-name field
  - date-range fields
  - status chips
- Buyer status filter options should prefer `purchase_request_status_ui` and may fall back safely to buyer-home RPC `status/status_label` values when needed for resilience.
- When buyer-home filters are active, the navbar should show a dismissible applied-filter chip using localized label `Filtros (1)`.

## Implementation Rules
- Do not define static buyer/seller navbar lists in app code.
- Do not hardcode role-to-menu mapping in client logic when `role_menu` exists.
- Do not define static top-navbar segment arrays in app code when `segment` exists.
- Load navbar config after session/profile resolution and render DB order (`sort_order`).
- Keep client behavior presentation-only (active state, press handling, accessibility).
- Do not convert the home search trigger back into a standalone local text input on home routes unless product requirements change.
