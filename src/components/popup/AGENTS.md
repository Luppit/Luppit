# AGENTS.md

## Scope
Applies to shared popup rendering in this folder.

## Popup Visual Contract
- Popup shells must use the shared glass sheet material through `GlassSurface` with the `sheet` role.
- Controls inside popup sheets must stay plain and readable: white background, grey border, no blur, no glass tint, and no one-off shadow.
- Popup filter text fields and date selectors use the shared plain control shape: 48px height, pill radius, grey border, white background, dark text, and muted placeholder/icon color.
- Popup filter chips are plain bordered chips by default; selected chips may use the app primary color.
- Do not use `t.glass.control` or `t.glass.chip` for popup-internal inputs, date controls, or filter chips. Reserve glass roles for the popup shell and app chrome.
