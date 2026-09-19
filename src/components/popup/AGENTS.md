# AGENTS.md

## Scope
Applies to shared popup rendering in this folder.

## Popup Contract
- Popup shells use the shared glass sheet material through `GlassSurface` with the `sheet` role.
- Popup headers never include a top-right icon or close button and expose no header-action slot. Dismiss through existing footer actions, configured backdrop/drag behavior, or Android Back. Android Back dismissal is configured independently of header visuals.
- Do not add visible ordinal captions such as `Foto 1` to ordinary offer thumbnails. Keep accessible image labels and meaningful comparison captions when they distinguish current and proposed terms.
- Popup-internal controls stay plain/readable; do not use glass roles for text fields, date controls, or filter chips inside sheets.
- Filter chips are plain bordered chips; selected chips may use primary color, but status-color dots are reserved for status chips on cards/profile active chips.
- Profile switcher is a `GlobalPopupHost` variant, not a custom overlay. Keep shared bottom-sheet shell, drag indicator, backdrop, spacing, separators, and the shared `Activo` status chip.
- Saved-profile notification rows show a red dot only when unread count is greater than zero; otherwise show `Sin notificaciones pendientes`.
- When the keyboard is visible, keep popup actions fixed and give the popup body a bounded, scrollable height. Do not dismiss the keyboard from a sheet-level `onTouchStart`; use the scroll view dismissal mode so scrolling and focused inputs continue to work.
- Keep side-by-side action labels short so they stay on one line. Prefer concise verbs such as `Volver`, `Cancelar`, `Guardar`, or `Eliminar`; do not repeat the popup title or object name in each button.

## Helper Variant
- Helper content is a `GlobalPopupHost` `helper` variant, not a separate modal style.
- Do not add a close `X`; dismissal comes from standard action buttons or backdrop behavior.
- Helper rows render as FAQ-style collapsed rows in a rounded inset panel.
- When opened from an OTP confirmation input, keep the parent confirmation alive. `Volver` returns to the OTP form, while `Finalizar` executes the same parent confirm action.
- Helper action labels/icons/colors remain DB-driven through the parent confirmation template when opened from confirmation input config.
