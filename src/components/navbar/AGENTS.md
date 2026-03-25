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

## Implementation Rules
- Do not define static buyer/seller navbar lists in app code.
- Do not hardcode role-to-menu mapping in client logic when `role_menu` exists.
- Load navbar config after session/profile resolution and render DB order (`sort_order`).
- Keep client behavior presentation-only (active state, press handling, accessibility).
