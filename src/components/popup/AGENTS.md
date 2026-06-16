# AGENTS.md

## Scope
Applies to shared popup rendering in this folder.

## Popup Visual Contract
- Popup shells must use the shared glass sheet material through `GlassSurface` with the `sheet` role.
- Controls inside popup sheets must stay plain and readable: white background, grey border, no blur, no glass tint, and no one-off shadow.
- Popup filter text fields and date selectors use the shared plain control shape: 48px height, pill radius, grey border, white background, dark text, and muted placeholder/icon color.
- Popup filter chips are plain bordered chips by default; selected chips may use the app primary color.
- Popup filter chips must not render status-color dots even when their options include style metadata; keep dots reserved for status chips on request cards/profile active chips.
- Do not use `t.glass.control` or `t.glass.chip` for popup-internal inputs, date controls, or filter chips. Reserve glass roles for the popup shell and app chrome.
- The profile switcher is a `GlobalPopupHost` variant, not a custom overlay. It must keep the shared bottom-sheet shell, drag indicator, backdrop, spacing, and separators.
- Profile switcher active state must reuse the shared status-chip component used by buyer purchase request cards, with label `Activo`; do not duplicate the pill styling locally in the popup.
- Profile switcher notification rows should show the red dot only when unread count is greater than zero. For zero or missing counts, hide the dot and render `Sin notificaciones pendientes`.

## Helper Popup Variant
- Helper content is a `GlobalPopupHost` variant (`type: "helper"`), not a separate modal style. It must keep the standard bottom-sheet shell, drag indicator, title block, separator, description spacing, margins, and fixed bottom action row used by summary popups.
- Do not add a close `X` to helper sheets. Dismissal must come from the standard action buttons or backdrop behavior.
- Helper popup sections should render as FAQ-style collapsed rows inside a rounded inset panel: row title, chevron, separator between rows, and answer content shown only after tapping the row.
- The helper rows panel is the scrollable region; title, description, and bottom action buttons stay fixed.
- When an OTP input opens a helper from `component_config.helper_popup` / `component_config.helper`, keep the parent confirmation popup alive. The helper must reuse the parent confirmation actions, so `Volver` closes only the helper and returns to the OTP form, while `Finalizar` closes the helper and executes the same parent confirm action.
- Helper action labels/icons/colors should remain DB-driven through the parent confirmation template when opened from a confirmation input. Do not add duplicate helper button labels to DB config unless the helper is opened as a standalone popup without parent actions.
