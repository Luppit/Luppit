# AGENTS.md

## Scope
Applies to shared popup rendering in this folder.

## Popup Visual Contract
- Popup shells must use the shared glass sheet material through `GlassSurface` with the `sheet` role.
- Controls inside popup sheets must stay plain and readable: white background, grey border, no blur, no glass tint, and no one-off shadow.
- Popup filter text fields and date selectors use the shared plain control shape: 48px height, pill radius, grey border, white background, dark text, and muted placeholder/icon color.
- Popup filter chips are plain bordered chips by default; selected chips may use the app primary color.
- Do not use `t.glass.control` or `t.glass.chip` for popup-internal inputs, date controls, or filter chips. Reserve glass roles for the popup shell and app chrome.
- The profile switcher is a `GlobalPopupHost` variant, not a custom overlay. It must keep the shared bottom-sheet shell, drag indicator, backdrop, spacing, and separators.
- Profile switcher active state must reuse the shared status-chip component used by buyer purchase request cards, with label `Activo`; do not duplicate the pill styling locally in the popup.
- Profile switcher notification rows should show the red dot only when unread count is greater than zero. For zero or missing counts, hide the dot and render `Sin notificaciones pendientes`.
