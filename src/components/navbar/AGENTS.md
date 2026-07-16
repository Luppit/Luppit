# AGENTS.md

## Scope
Applies to navbar UI components and rendering behavior.

## DB-Driven Navbar
- Bottom navbar items must come from `public.get_navbar_items_by_profile(p_profile_id uuid)`, using DB role/menu metadata. No hardcoded buyer/seller menu fallback.
- Render returned `label`, `route`, `icon`, and `sort_order` directly; unknown icon keys may be omitted safely.
- Top horizontal segment chips come from `segment`; render `name`, `svg_name`, and `is_disabled`.
- Segment icons resolve to `assets/segments/{svg_name}.svg`; `svg_name='todas'` clears segment narrowing in home RPC wrappers.
- Segment selection state is shared through `segment.service.ts`, not navbar-local state.

## Home Header Behavior
- The large home search control is a visual trigger, not a free-typing search field.
- Buyer/seller filter popups should drive home RPC params through shared state, not client-only filtering.
- Applied filters should show a dismissible localized chip such as `Filtros (1)`.
- Profile name row opens the shared profile-switcher popup. Active profile presses are ignored; non-active presses switch the root active-profile context without changing the auth session.
- Switcher rows come from `get_current_user_profiles()` and are identified only by profile ID; never restore the removed saved-profile or OTP handoff state.

## Visual Rules
- Top-navbar chrome must use shared glass (`GlassSurface` + `t.glass.chrome/control/chip`) and attach through the safe area with only bottom corners rounded.
- Keep client behavior presentation-only: active state, press handling, accessibility, and popup config.
- Do not build custom popup sheets in navbar components; pass configs to `GlobalPopupHost`.
