# Auth Design QA

## Comparison target

- Auth layout baseline: `/Users/josedanielcr/.codex/generated_images/01a0364b-b2e2-7452-b525-681acbcd33ee/exec-b6bcc347-3f7f-48d9-af00-5abe0689bfb1.png`
- Latest switcher source visual truth: `/Users/josedanielcr/.codex/generated_images/01a0364b-b2e2-7452-b525-681acbcd33ee/exec-5b879ce3-df1e-4067-a69c-e5ba56045ef8.png`
- Glass-provider regression source: `/Users/josedanielcr/Downloads/Screenshot 2026-08-24 at 22.06.35.png`
- Rendered implementation:
  - `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/auth-home.png`
  - `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/auth-signup-glass.png`
  - `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/auth-signup-glass-seller.png`
  - `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/auth-signup-glass-provider-fix.png`
  - `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/glass-provider-home-check.png`
  - `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/auth-login.png`
- Native viewport: iPhone 17 Pro Simulator, 402 × 874 CSS points, iOS 26.2.
- Implementation captures: 1206 × 2622 pixels at 3× density.
- Source board: 1536 × 1024 pixels. Each selected screen was cropped to 500 × 1008 pixels.
- Normalization: each native capture was resized to 500 pixels wide, then cropped by 18 pixels at the top and 61 pixels at the bottom to produce a 500 × 1008 comparison. Native status-bar and safe-area chrome are preserved in the app and excluded from app-owned fidelity findings.
- States: welcome; sign-up step 1 with buyer selected and consent unchecked; login step 1 with an empty phone input.

## Full-view comparison evidence

- Welcome: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/comparison-home.png`
- Sign-up baseline: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/comparison-signup.png`
- Sign-up glass switcher: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/comparison-signup-glass.png`
- Glass highlight regression before/after: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/comparison-glass-provider-line.png`
- Login: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/comparison-login.png`

The left side of each comparison is the selected mockup and the right side is the rendered native implementation. Focused crops were not required because typography, icons, control outlines, spacing, and all copy remain legible at the normalized 500 × 1008 size.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: Poppins weights, sizes, line heights, wrapping, and hierarchy match the reference. Secondary copy now uses a restrained mid-gray treatment instead of the earlier low-contrast gray or near-black appearance.
- Spacing and layout rhythm: sign-up and login headers, progress rings, horizontal margins, tab placement, fields, consent content, and buttons align within a few pixels of the reference. The welcome screen keeps flexible vertical spacing for the taller native viewport instead of forcing fixed mockup coordinates.
- Colors and visual tokens: background, white controls, black actions, neutral borders, and the limited green progress/logo accent match the selected direction. The role switcher uses the shared glass `control` and `segmentActive` materials with no green selected state.
- Image quality and asset fidelity: the welcome mark uses the repository's real Luppit logo asset; no placeholder or code-drawn replacement was introduced.
- Copy and content: all selected Spanish copy is present and correct, including the visible “o” separator and “Siguiente paso: Verificación de código”.
- Interaction and accessibility: buyer/seller selection, legal-consent checked/unchecked states, back navigation, field focus, and the software-keyboard layout were exercised in the clean simulator. Roles and selected/checked states are exposed through accessibility semantics.

Expected deviations:

- The native iOS status bar, Dynamic Island, and safe areas remain visible because they are platform-owned chrome and were intentionally omitted from the generated reference board.
- The native viewport is taller than each generated board panel, so the welcome screen retains responsive flexible whitespace rather than copying one fixed vertical coordinate set.

## Comparison history

### Iteration 1

- Earlier finding: the sign-up legal acceptance lived at the bottom of the screen instead of in the form's decision sequence; the role selector lacked the reference's bordered selected state and checkmark; the welcome separator appeared as an unexplained circle.
- Fix: moved consent and legal links between the phone field and primary action, added a non-color selected role treatment, and replaced the separator circle with “o”.
- Post-fix evidence: native signup and welcome captures confirmed the corrected hierarchy and states.

### Iteration 2

- Earlier finding: auth form margins were narrower than the reference and the consent section's vertical rhythm was compressed.
- Fix: aligned the shared stepper to the 24-point horizontal margin and adjusted tab-to-form and consent spacing.
- Post-fix evidence: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/comparison-signup.png` and `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/comparison-login.png` show the controls aligned within a few pixels.

### Iteration 3

- Earlier finding: supporting copy was darker than the selected reference while the country code remained too faint.
- Fix: tuned both through existing theme colors plus restrained opacity.
- Post-fix evidence: the final three comparison images show consistent secondary hierarchy without compromising readability.

### Iteration 4

- Earlier finding: the bordered buyer/seller control and selected-state checkmark felt too heavy and did not use Luppit's current glass language.
- Fix: replaced the track with the shared `GlassSurface` control material, used the existing active-segment material for the selected role, removed the checkmark and black outline, and tuned the shared control recipes so they remain visibly frosted on a white auth background.
- Post-fix evidence: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/comparison-signup-glass.png` shows the approved mock and native buyer-selected render together; the seller-selected capture confirms the material and accessibility state move correctly.

### Iteration 5

- Earlier finding: the shared optional `topHighlight` layer rendered as a long interior white streak instead of an edge reflection on controls, cards, toasts, and success sheets.
- Fix: removed the synthetic highlight layer and its call sites, kept the system-material blur and role-specific edge colors as the only highlight source, and applied continuous iOS corner curves to shared glass shells and nested material controls.
- Post-fix evidence: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/auth-signup-glass-provider-fix.png` confirms the streak is gone while the control retains blur, edge definition, and depth. `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/glass-provider-home-check.png` confirms the signed-in chrome, cards, and bottom navigation remain visually intact.

## Implementation checklist

- [x] Preserve existing phone OTP behavior and route contracts.
- [x] Match welcome, sign-up, and login visual hierarchy.
- [x] Verify buyer and seller selected states.
- [x] Verify legal consent checked and unchecked states.
- [x] Verify phone-field focus and software-keyboard layout.
- [x] Run scoped ESLint, TypeScript, and unit tests.

## Buyer and seller assistant design QA

### Comparison target

- Request-processing source: `/Users/josedanielcr/.codex/generated_images/01a0364b-b2e2-7452-b525-681acbcd33ee/exec-80d62540-8247-4c9e-9f15-8a78dab84620.png`
- Request-review source: `/Users/josedanielcr/.codex/generated_images/01a0364b-b2e2-7452-b525-681acbcd33ee/exec-b8d48aba-6657-4b09-ad66-3ca70b5d7090.png`
- Native buyer processing capture: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/assistant/buyer-processing-native.png`
- Native buyer review capture: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/assistant/buyer-review-native.png`
- Processing comparison: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/assistant/comparison-buyer-processing.png`
- Review comparison: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/assistant/comparison-buyer-review.png`
- Native viewport: iPhone 17 Pro Simulator, 402 × 874 CSS points, iOS 26.5.

The left side of each comparison is the approved generated design and the right side is the native implementation. The reference and implementation use different request content, so content-driven wrapping and the number of summary rows are not treated as fidelity defects.

### Findings

No actionable P0, P1, or P2 visual differences remain.

- Processing hierarchy: the native flow matches the approved user bubble, restrained copy/share utilities, three-step vertical progress treatment, explanatory copy, and underlined stop action. The current step advances against the real AI request rather than being a static mock.
- Color restraint: black, white, and neutral gray carry the hierarchy. Green remains limited to the existing pale user bubble and normal Luppit control accent; the busy composer no longer adds a second green stop control.
- Review hierarchy: review mode now opens at the top, replaces the long transcript with the approved concise review lead, and presents a calm white summary surface with label/value rows, a black primary action, and a quiet secondary action.
- Dynamic content: summaries keep all backend-provided category and attribute values. When a real summary has more rows than the reference example, the surface scrolls instead of dropping or fabricating data.
- Buyer composer: the request assistant is text-only, hides attachments, and changes its prompt to “Escribe un cambio” in review mode.
- Seller parity: the offer assistant uses the same shared progress and review components, with offer-specific steps, price/delivery rows, photo count, missing-field notice, and required-photo error. It retains image attachments and its own `offerDraftId`, restore, continue, publish, stop, and discard behavior.
- Accessibility: progress exposes the active step as a live progress value, stop remains an explicit button, summary actions retain button semantics, and the disabled composer remains exposed as “Enviar mensaje”.

Expected deviations:

- The native status bar and Dynamic Island remain platform-owned chrome.
- The captured request content and backend-derived summary fields differ from the mock's sample desk request.
- The seller account had no eligible opportunities during native QA, so opening a new offer-assistant route would have required publishing marketplace data. Seller-specific rendering was verified through the shared native components plus compile/lint coverage without publishing a request or offer.

### Comparison history

#### Iteration 1

- Added shared assistant progress and review presentation primitives and applied them to both buyer requests and seller offers without merging their backend state or actions.

#### Iteration 2

- Earlier finding: entering review kept the transcript and inherited the previous bottom scroll offset, hiding the card's completion header.
- Fix: review mode now focuses on the concise review lead and summary, and resets its scroll position to the top while preserving scroll access for longer real summaries.

#### Iteration 3

- Earlier finding: the composer displayed a second green stop button while the approved design already provided the textual “Detener” action inside the processing state.
- Fix: the progress component owns cancellation on these assistant surfaces; the disabled composer returns to the neutral send appearance shown in the selected design.

#### Iteration 4

- Earlier finding: the full three-step preparation sequence appeared during every AI turn, implying that a summary was being generated during ordinary clarification messages.
- Fix: ordinary buyer and seller messages now show only the shared “Pensando” state. The three-step sequence is tied specifically to the backend `SHOW_SUMMARY` action, and the seller review card opens only after that action succeeds.
- Post-fix evidence: the signed-in buyer simulator exposed only `Pensando` during a normal request turn and transitioned directly to the review card after the explicit summary confirmation completed.

#### Iteration 5

- Earlier finding: the seller flow repeated the assistant's “¿Deseas ver el resumen?” prompt with a separate “Oferta lista / Revisar resumen” action card.
- Fix: removed the redundant seller-only review prompt card. Buyer and seller now both wait for a conversational confirmation such as “sí”, run `SHOW_SUMMARY` with the three preparation steps, and reveal the review card only after the summary response succeeds.

### Assistant implementation checklist

- [x] Preserve buyer `draft_id` and `SHOW_SUMMARY` / `CONTINUE` / `PUBLISH` actions.
- [x] Preserve seller `offerDraftId`, restore, photo, retry, discard, continue, and publish behavior.
- [x] Keep buyer attachments hidden and seller attachments available.
- [x] Exercise buyer processing and review states in the signed-in native simulator without publishing.
- [x] Run repository lint, scoped ESLint, TypeScript, and all unit tests.

final result: passed

## Conversation upper actions design QA

### Comparison target

- Source visual truth: `/Users/josedanielcr/Development/Luppit/ux-audit-2026-08-25-conversation-upper-actions/assets/09-recommendation-delayed-single-action.png`
- Native implementation capture: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/conversation-upper-actions-after.png`
- Normalized implementation screen: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/conversation-upper-actions-after-screen.png`
- Full-view comparison: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/conversation-upper-actions-comparison.png`
- Native viewport: iPhone 17 Pro Simulator, 393 × 852 point app-screen crop, iOS 26.5.
- Source pixels: 853 × 1844, normalized to 393 × 852 with Lanczos resampling.
- Implementation pixels: 455 × 969 full Simulator capture, cropped to the 393 × 852 device screen at `(30, 94, 423, 946)`.
- State: buyer, delayed acceptance, one destructive `TOP` action, passive overdue `STATUS` slot, composer visible.

The source and implementation were placed in the same normalized comparison board before judging. A separate focused crop was not required because the header, summary, amount, action, first visible thread content, status card, and composer are all legible in the 826 × 912 comparison.

### Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the implementation intentionally uses Luppit's existing Poppins hierarchy rather than the generated mock's approximate system typography. Request title, overdue eyebrow, status title, supporting amount, and action label retain the same hierarchy and remain readable.
- Spacing and layout rhythm: navigation, compact summary, and action now form one top-attached glass silhouette. The native action is slightly taller than the mock to preserve a 48-point target. Chat, passive status, and composer remain visible without overlap.
- Colors and visual tokens: the implementation uses the shared `chrome` GlassSurface and theme colors. Overdue state is communicated by red plus text; the destructive action uses the approved white/red outline treatment. No one-off blur, shadow, or translucent surface was added.
- Image quality and asset fidelity: no new raster assets were required. Existing Lucide icons are used for navigation and actions; no code-drawn replacement or placeholder was introduced.
- Copy and content: request, status, amount, and action content come from the real conversation view. The implementation preserves the DB-provided `₡20000` display instead of client-formatting it to the mock's illustrative `₡20.000`.
- Interaction and accessibility: back and overflow are named 44-point buttons, the request title is exposed as a heading, the top action exposes its DB label and disabled/busy state, and the confirmation opens with the existing DB copy. “Volver” was used to dismiss it; no destructive action was submitted.

Expected deviations:

- Dynamic Island/status-bar chrome is platform-owned and differs from the generated mock.
- The real thread auto-scroll position and content wrapping differ from the synthetic mock data.
- The approved received-offer/two-action direction could not be rendered against live data because no pending offer existed. Its responsive two-button row and large-text stack are covered by the shared renderer plus lint/TypeScript checks, but still merit device verification when a safe pending fixture is available.
- No Metro terminal was attached to this task, so console output could not be inspected. The simulator showed no red error screen and the screen loaded and interacted normally.

### Comparison history

#### Iteration 1

- Earlier finding: large-text stacking combined `flex: 1` with column layouts, allowing the single action and supporting price to overlap the summary.
- Fix: separated full-width and equal-width button sizing, removed column-axis flex growth, and split summary/action responsive thresholds.
- Post-fix evidence: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/conversation-upper-actions-after.png` shows a full-width 48-point action below the summary with no overlap.

#### Iteration 2

- Earlier finding: the delayed-state amount used the same large price treatment intended for a received offer, competing with the overdue state and making the shelf feel taller.
- Fix: retained strong price emphasis when no status headline exists, but used supporting emphasis when the DB supplies an upper status title.
- Post-fix evidence: `/Users/josedanielcr/Development/Luppit/design-qa-artifacts/conversation-upper-actions-comparison.png` shows the delayed status leading and the amount supporting it, matching the selected direction.

### Implementation checklist

- [x] Preserve DB `TOP`, `AUX`, `MENU`, and `STATUS` placement and ordering.
- [x] Keep detailed passive status content inside the scrollable thread.
- [x] Collapse terminal states to header-only.
- [x] Preserve the existing confirmation executor and copy.
- [x] Add pressed, disabled, and active-action loading presentation.
- [x] Add explicit navigation/action semantics and large-text reflow.
- [x] Run scoped ESLint and TypeScript.
- [x] Verify delayed buyer, terminal buyer, seller delayed/AUX, and confirmation/dismissal in the simulator.

final result: passed
