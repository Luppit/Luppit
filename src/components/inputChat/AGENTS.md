# AGENTS.md

## Scope
Applies to the shared `InputChat` composer component and its styles.

## Shared Composer Contract
- `InputChat` is shared by conversation chat and buyer request-assistant chat; preserve shared behavior unless product explicitly asks for a surface-specific change.
- Conversation chat may send text and images when DB permissions allow it.
- Buyer request-assistant chat supports images through its service/Edge contract; the call site limits selection to 3 images and the service validates buyer-specific size/type limits.
- Do not move DB-driven send permission, AUX action placement, or conversation message creation logic into this component.

## Multiline Autosize
- Keep multiline sizing driven by an in-flow hidden `Text` mirror that sizes the input area, with the visible `TextInput` absolutely overlaid on top.
- Do not drive composer height from `TextInput.onContentSizeChange`, controlled height feedback loops, or line-count state. Those approaches can lag at wrap boundaries or oscillate.
- The mirror `Text` must remain in normal layout flow; do not make it `position: "absolute"`. It should be hidden visually with opacity while still sizing the shell.
- Preserve the trailing-newline guard in the mirror value so empty/new trailing lines are measured.
- Keep the mirror and visible input typography, line height, and vertical padding in sync.
- Avoid horizontal padding inside the multiline `TextInput`; keep horizontal spacing in the surrounding composer layout so wrapping and measurement stay aligned.
- The input area should keep `flex: 1`, `minWidth: 0`, `minHeight`, `maxHeight`, and `overflow: "hidden"`; row action buttons should stay bottom-aligned and stable in size.

## Verification
- After composer changes, test single-line centering, long wrapping text, trailing newline behavior, max-height scrolling, image previews/removal, disabled/busy state, and buyer text-only, image-only and text-plus-image sends.
