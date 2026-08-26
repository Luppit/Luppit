# ImageGen Record

- Mode: built-in ImageGen.
- Date: 2026-08-25.
- Use: final workspace-bound Luppit UI mockups.
- Every final image was generated separately and copied into this folder.

## 01 — Selected seller Profile

```text
Use case: precise-object-edit
Asset type: final production-quality Luppit iOS seller Profile mockup
Input image: Image 1 is the selected edit target.

Primary request: Preserve Image 1's selected lightweight seller-profile design exactly. Correct only the malformed numeral in the right-hand "Categorías" summary so it cleanly reads the single digit "3" in the same bold black typography as the left-hand "5.0". Ensure the word below stays exactly "seleccionadas". Preserve every other pixel-level design decision as closely as possible: layout, business thumbnail, full business name, location, spacing, colors, white surfaces, divider, icons, rows, bottom navigation, readable secondary text, and all other Spanish copy.

Required text in the categories group, verbatim:
"Categorías"
"3"
"seleccionadas"

Constraints: change only the malformed numeral; do not add a device frame, status bar, clock, Dynamic Island, annotations, callouts, new features, or extra text. Do not crop the screen or alter the selected option's visual hierarchy.
```

## 02 — Profile switcher

```text
Use case: ui-mockup
Asset type: final production-quality Luppit iOS profile-switcher bottom-sheet mockup
Target dimensions: 390 x 844 portrait mobile app content only.

Input images: Image 1 is the current profile-switcher state and product-content reference. Image 2 is the selected lightweight Profile direction and visual-style reference.

Primary request: Redesign only the profile switcher to fix long-name clipping while preserving Luppit's current shared popup contract and behavior. Show the buyer home dimmed behind a translucent bottom-sheet backdrop. The bottom sheet must use the existing restrained glass sheet material, rounded top corners, drag indicator, soft separators, and plain readable internal rows.

Show two profile rows using realistic current data:
First row: real buyer avatar, full name "Jose Daniel Canales Rodriguez" allowed to wrap to two lines, shared status chip "Activo" retained and placed in its own trailing/below-title slot so it never compresses or clips the name, and metadata "Comprador · Sin notificaciones pendientes".
Second row: circular "JD" business avatar, full name "Jose Daniel Canales Rodriguez" allowed to wrap to two lines, and metadata "Llantas Los Magos Llenos · Sin notificaciones pendientes".
Below the rows, show the centered action "+ Agregar negocio".

Accessibility/quality: each row at least 88 pt tall, names dark #1C1C1C, metadata clearly readable around #5B5F66, separators subtle, active status conveyed by the visible "Activo" text plus green dot. Keep all text legible at larger sizes. The green action text must use a darker readable green on white. Do not replace the required "Activo" chip with a checkmark.

Presentation constraints: output only the app viewport—no phone bezel, simulator toolbar, device body, status bar, clock, Dynamic Island, battery, home indicator, annotations, callouts, labels, or design-direction title. Preserve the existing Spanish strings verbatim. Do not invent profiles, notifications, features, navigation, gradients, dominant green surfaces, or a new sheet pattern.
```

## 03 — Buyer Settings contrast

```text
Use case: ui-mockup
Asset type: final production-quality Luppit iOS buyer Settings contrast and large-text-resilience mockup
Target dimensions: 390 x 844 portrait mobile app content only.

Input images: Image 1 is the current buyer Settings screen and exact content/structure reference. Image 2 is the selected Profile direction and readability/style reference.

Primary request: Create a corrected version of the current buyer "Configuración" screen. Preserve the current navigation and information architecture exactly: top-attached restrained glass header with back arrow and centered "Configuración"; pale #F9FAFB background; labels outside plain white soft rounded grouped-list surfaces; no bottom navigation.

Visible content, verbatim:
Section "Cuenta":
- "Foto de perfil" with right value "Agregada" and chevron
- "Número telefónico" with right value "50685501896" and no chevron
- "Nombre" with right value "Jose Daniel Canales Rodriguez" allowed to wrap and no chevron
- "Correo" with chevron
Section "Notificaciones y ayuda":
- "Notificaciones" with chevron
- "Notificaciones push" with right value "Sin configurar" and chevron
- "Ayuda" with chevron
- "Contactar soporte" with description "Escríbenos a support@luppit.com." and chevron
Begin the next section label "Legal" near the lower viewport edge, consistent with scrolling.

Fix: replace the disabled-looking pale gray text with clearly readable secondary text around #5B5F66 on white/near-white, while keeping black/dark gray primary labels and subtle separators. Use a darker accessible gray for chevrons. Keep normal values visually secondary but not disabled. Rows with wrapped values/descriptions must grow vertically rather than clip. Use calm 54–74 pt row rhythm and the existing icon family. Maintain generous iOS spacing and continuous 28 pt surface corners.

Presentation constraints: output only the app viewport—no phone bezel, simulator toolbar, device body, status bar, clock, Dynamic Island, battery, home indicator, annotations, color swatches, contrast labels, or callouts. Do not invent new sections, fields, buttons, glass cards, gradients, features, or navigation. Render the Spanish copy and phone number exactly.
```

## 04 — Completed history error

```text
Use case: ui-mockup
Asset type: final production-quality Luppit iOS completed-requests recoverable-error state
Target dimensions: 390 x 844 portrait mobile app content only.

Input images: Image 1 is the current stuck loading screen and header reference. Image 2 is the selected Luppit visual direction and readability reference.

Primary request: Design the reachable buyer "Solicitudes finalizadas" error state that replaces an indefinitely spinning loader after a bounded failure. Preserve the current detail-screen architecture: pale #F9FAFB background; restrained top-attached glass header with back arrow and centered title "Solicitudes finalizadas"; no bottom navigation.

Below the header show the existing list header:
- Supporting text "Aquí encuentras únicamente solicitudes finalizadas."
- A 48 pt rounded search/filter control with sliders icon and "Buscar y filtrar"
- A separate 48 pt sort icon button
- Summary text "0 resultados"

Then show one calm, centered plain-white soft rounded empty-state surface, not a glass card:
- 48 pt pale-green circular icon badge with an alert-circle icon
- Title "No pudimos cargar el historial"
- Description "Ocurrió un problema al cargar tus solicitudes finalizadas."
- A clearly tappable minimum-44-pt compact action "Reintentar"

Accessibility/quality: primary text #1C1C1C; secondary copy around #5B5F66; action uses dark readable text with a restrained green accent; icon, title, copy, and action are grouped in logical order; do not rely on color alone; no pale #BBBBBB normal text. Keep generous spacing and preserve room for Dynamic Type.

Presentation constraints: output only the app viewport—no phone bezel, simulator toolbar, device body, status bar, clock, Dynamic Island, battery, home indicator, annotations, callouts, labels, or bottom navigation. Do not invent data cards, filters, new features, illustrations, gradients, dominant green surfaces, or navigation. Render all quoted Spanish strings verbatim and add no extra text.
```

## 05 — Completed history empty

```text
Use case: precise-object-edit
Asset type: final production-quality Luppit iOS completed-requests empty state
Target dimensions: 390 x 844 portrait mobile app content only.

Input images: Image 1 is the approved visual structure for the recoverable error state and should be preserved as the base. Image 2 is the current history screen reference.

Primary request: Convert only the central error surface from Image 1 into the normal buyer empty state. Preserve the top glass header, back arrow, "Solicitudes finalizadas" title, supporting text, search/filter control, sort control, "0 resultados", spacing, colors, and all surrounding layout exactly.

Inside the central plain-white soft rounded surface:
- Replace the alert icon with a simple green check icon inside the same pale-green 48 pt circular badge.
- Replace the title with "Aún no hay solicitudes finalizadas".
- Replace the description with "Las compras que completes aparecerán aquí."
- Remove the "Reintentar" button entirely; normal empty state has no action.

Accessibility/quality: keep the title dark, the description clearly readable around #5B5F66, and preserve logical visual grouping with generous whitespace. No pale #BBBBBB normal text.

Presentation constraints: change only the empty-state content. Output app viewport only—no device frame, status bar, clock, Dynamic Island, simulator chrome, annotations, callouts, or extra text. Do not invent data, actions, illustrations, gradients, features, or navigation. Render every quoted Spanish string verbatim.
```
