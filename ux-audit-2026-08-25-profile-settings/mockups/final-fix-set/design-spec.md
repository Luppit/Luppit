# Luppit Profile and Settings — Final Fix Set

Selected visual direction: option 3, the lightweight identity header.

This package covers every audit finding. Static mockups are provided only where the correction is visible; semantic and state requirements cover fixes that cannot be represented honestly in a bitmap.

## Mockup inventory

1. `01-seller-profile-selected.png`
   - Fixes F-04 by making the active business the primary seller identity.
   - Fixes F-03 on this surface with readable secondary text.
   - Fixes F-07 with `1 calificación`.
   - Preserves existing business data, action destinations, and seller tabs.

2. `02-profile-switcher-long-name.png`
   - Fixes F-06 by allowing profile titles to wrap to two lines.
   - Retains the shared `Activo` status chip required by the popup contract.
   - Uses readable metadata and green action text.

3. `03-buyer-settings-contrast.png`
   - Fixes the visible part of F-03 across shared settings rows.
   - Demonstrates row growth for wrapped values and descriptions.
   - Preserves the existing buyer Settings information architecture.

4. `04-completed-requests-error.png`
   - Fixes the visible state gap in F-01 with a terminal, recoverable error.
   - Provides a clear `Reintentar` action and keeps filters/sort available.

5. `05-completed-requests-empty.png`
   - Completes F-01's state model with a distinct successful empty state.
   - Uses the existing buyer empty copy and no unnecessary action.

## Shared visual tokens

- Primary text: existing `#1C1C1C` / `#333333`.
- Normal secondary text reference: `#5B5F66`.
  - 6.42:1 on white.
  - 6.14:1 on `#F9FAFB`.
- Small green text reference: `#5B760D`.
  - 5.20:1 on white.
  - 4.97:1 on `#F9FAFB`.
- Keep existing `#83A31E` for larger icons, indicators, and non-text accents where appropriate.
- Disabled text/state must remain visually distinct from normal secondary content; do not reuse `stateAnulated` for ordinary values and descriptions.
- Plain content surfaces remain white with the existing 28 pt continuous radius. Glass remains limited to chrome, navigation, sheets, chips, and established controls.

## State contract for completed history

The mockups describe the intended terminal states; they do not replace the underlying diagnosis.

1. **Role resolution:** The initial role gate must resolve to buyer or seller content. It must not own an indefinite spinner.
2. **Loading:** Show `Cargando historial…` while a request is actively pending. Expose a busy/progress semantic state.
3. **Loaded:** Render the existing buyer marketplace cards or seller offer cards and preserve RPC-provided labels/data.
4. **Empty:** Show the role-specific description:
   - Buyer: `Las compras que completes aparecerán aquí.`
   - Seller: `Las ventas que completes aparecerán aquí.`
5. **Error:** Show `No pudimos cargar el historial`, a concise non-technical description, and `Reintentar`.
6. **Filtered empty:** Keep the existing `No hay resultados` and `Limpiar filtros` behavior separate from a truly empty history.
7. **Refreshing/loading more:** Preserve already-loaded content and use the existing inline refresh/footer progress patterns.

## Invisible accessibility specifications

### F-02 — Settings gear

- Touch target: at least 44 × 44 pt.
- Role: `button`.
- Accessible label: `Configuración`.
- Optional hint: `Abre la configuración de tu cuenta.`
- Do not expose the decorative gear icon as a second element.

### F-05 — Grouped rows

Every pressable row must expose the same information that is visible:

- `accessibilityLabel`: row label.
- `accessibilityValue.text`: visible value when present.
- `accessibilityHint`: description only when it explains the result of activating the row.
- `accessibilityState.disabled`: when a row is unavailable.

Examples:

- `Foto de perfil`, value `Agregada`, role `button`.
- `Notificaciones push`, value `Sin configurar`, role `button`.
- `Contactar soporte`, hint `Escríbenos a support@luppit.com.`, role `button`.

### F-06 — Profile switcher

- Profile title supports two lines; never solve overflow by shrinking text.
- The `Activo` chip gets a dedicated, non-compressing slot.
- Row minimum height grows with wrapped title/metadata; 88 pt is the base reference.
- Each row exposes one coherent accessible element: title, role/business subtitle, notification state, and active state.
- Disabled active row must still announce `Activo`.

### F-08 — Profile metrics

Treat each metric card/group as one accessibility element in left-to-right order:

1. `Solicitudes, 8 creadas`.
2. `Rating promedio, 4.5, 2 calificaciones`.

For the selected seller design:

1. `Rating promedio, 5.0, 1 calificación`.
2. `Categorías, 3 seleccionadas`.

Hide the separate decorative icons and child labels from duplicate traversal after grouping.

### Dynamic Type and reflow

- Remove the global 1.3× ceiling or raise it only with evidence from the supported accessibility-size matrix.
- Test at default, largest standard, and at least two accessibility sizes.
- Values may wrap below their labels when horizontal space is insufficient.
- Sheet content remains scrollable; fixed actions and safe areas remain reachable.

## Finding coverage

| Finding | Covered by |
|---|---|
| F-01 — History never completes | Error and empty mockups + state contract |
| F-02 — Gear unnamed | Invisible accessibility specification |
| F-03 — Low contrast | Seller, switcher, Settings, and history mockups + token references |
| F-04 — Seller identity hierarchy | Selected seller Profile mockup |
| F-05 — Row values omitted | Grouped-row accessibility specification |
| F-06 — Switcher clipping | Long-name switcher mockup + reflow specification |
| F-07 — Singular copy | Selected seller Profile mockup + pluralization rule |
| F-08 — Metric reading order | Metric accessibility specification |

## Pluralization rule

- `1 calificación`
- `{n} calificaciones` for all other values

Do not encode this as a visual-only string substitution in individual screens; use the existing shared data/presentation boundary closest to rating copy.
