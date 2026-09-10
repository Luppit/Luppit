# Bug 15: buyer request image upload

Implemented in the isolated app worktree based on `15f7acf`, with a paired Edge patch based on `8161db6` in `/Users/josedanielcr/.codex/worktrees/d53d/ai-edge-functions` (`codex/bug15-buyer-images`). No database migration, public API change, dependency, release build, merge, push or hosted deployment is included.

## Problem and resulting behavior

The buyer composer explicitly hid attachments even though its shared picker, previews, message bubbles and multipart service already supported images. The backend interaction classifier received only text: an empty prompt, or an image sent with “Sí”, could enter a non-vision handler and ignore the photo. The backend also told the model that buyers could not send images.

The buyer composer now accepts up to three images per message. The service normalizes MIME types and enforces the existing 2 MiB metadata limit and supported JPEG/JPG, PNG, WebP and GIF formats. The Edge parser independently checks actual multipart file bytes. Unsupported formats, including HEIC, return a validation error; this patch does not add conversion or compression.

Image-only messages send an empty prompt. The app no longer inserts text that labels the photo a visual reference. The Edge routes all turns containing new images to the existing BUILD vision pipeline and advertises image input capability. Text-only classification and explicit SHOW_SUMMARY, CONTINUE and PUBLISH actions retain their current paths.

## Traced contract and authorization

Read-only hosted inspection on 2026-09-09 confirmed `ai-completar` ACTIVE v394, JWT verification enabled, and these image paths in the deployed source:

- `server/requestParser.ts`: multipart `images`/`images[]`/`image`, at most 3 files, 2,097,152 bytes each; MIME allowlist in `server/imageInputPolicy.ts`.
- `services/aiService.ts`: actual `input_image` parts in the Responses API model payload. Image input via data URLs and multiple content parts is supported by [OpenAI's vision documentation](https://developers.openai.com/api/docs/guides/images-vision).
- `services/profileResolver.ts` and the function entrypoint: authenticated caller, owned active profile and profile-owned draft resolution before processing. The app service still resolves the current profile and registers its abort controller for profile changes.
- `services/imagePolicy.ts` / `handlers/interactionHandlers.ts`: the model chooses DIRECT_SUBJECT images for persistence; VISUAL_REFERENCE, IRRELEVANT and UNCLEAR images are not automatically published.
- `services/storageService.ts`: server-side upload under `profileId/imageGroupId/unique-file`, returning stable `storage://` references and temporary signed URLs. No client Storage INSERT permission is needed.
- Hosted `chat-product-images` bucket: private, 4,000,000-byte bucket cap, JPEG/JPG/PNG/WebP/GIF allowed. `chat_product_images_select_authorized` permits signing for the owning user's profile folder. [Supabase bucket restrictions](https://supabase.com/docs/guides/storage/buckets/creating-buckets) are additional to the stricter Edge limit.
- `services/conversationService.ts`: user-message metadata retains `image_count` and persisted `image_refs`; image-only transcript content is `[imagenes:N]`.
- `domain/publishedContract.ts` / `handlers/uiActionHandlers.ts`: persisted draft images pass into the published contract only through the existing PUBLISH path. Hosted `publish_purchase_request` verifies profile/draft ownership and stores that contract. Uploading images does not mark a draft published or bypass readiness.

## Changed files

App:

- `app/(chat)/_layout.tsx`: enable shared attachment selection, capped at 3.
- `app/(chat)/chat-session.context.tsx`: remove synthetic image-only prompt.
- `src/services/purchase.request.assistant.service.ts`: MIME normalization and metadata size/type validation before upload.
- `app/(chat)/AGENTS.md`, `src/components/inputChat/AGENTS.md`, `src/services/AGENTS.md`: replace stale text-only instructions.
- `tests/buyer-chat-stop.test.mts`, `tests/buyer-image-upload.test.mts`: composer, context and real service callback regressions.

Edge:

- `handlers/interactionHandlers.ts` and its deployable `supabase/functions/ai-completar/handlers/interactionHandlers.ts` mirror: image turns enter BUILD; image capability enabled.
- `handlers/aiOnlyGuardrails_test.ts`, `server/requestParser_test.ts`, `services/conversationService_test.ts`: routing, actual model-payload image parts, selected-image storage, upload failure, multipart byte/count limits and stable transcript reference signing.

## Verification

- App: `npm run test:unit` — **149 passed**; `npx tsc --noEmit`, `npm run lint`, `git diff --check` — passed.
- Edge: `deno test --allow-read --allow-env --allow-net` — **212 passed**; `deno check index.ts supabase/functions/ai-completar/index.ts` and `git diff --check` — passed.
- Deno lint on the changed Edge files reports **158 existing findings**, identical to the saved-main baseline by file/rule/message; no new findings. It is not a clean global lint pass.
- Tests cover text-only, image-only, text-plus-image, image-plus-summary-acknowledgment routing, removal before send, max selection, invalid type/size, upload failure, stop and retry with the original images/request identity, profile/caller cancellation, model delivery, selective persistence, transcript metadata and fresh signed URLs. Existing publication/readiness tests also pass.
- Model and Storage tests use local fixtures/mocks. The service tests execute actual request-building code using a native-FormData stand-in; they do not prove React Native multipart encoding or picker rendering on a device.
- No authenticated hosted upload, live-model interpretation, emulator, physical-device or app build validation was performed. Hosted access was read-only source/configuration/RPC-definition inspection; no user message data was read.

## Integration and remaining QA

Deploy the paired `ai-completar` change with its existing JWT/import-map configuration before distributing the app attachment change. No schema deployment is required.

Bug 14 owns draft resume/management. Coordinate its changes in `chat-session.context.tsx`, `_layout.tsx` and `purchase.request.assistant.service.ts`; preserve this patch's empty image prompt and upload validation. Bug 16 may also overlap the chat layout; preserve the attachment configuration while applying its keyboard fix. Both saved main checkouts and the saved database checkout were left clean.

There is currently no buyer RESTORE action in the approved API. This patch preserves all selected images in the current session's existing `ChatMessage.images: ChatImage[]` bubbles and retry payloads. Resume must map persisted `metadata.image_refs` to fresh signed URLs in `ChatImage.uri`; local picker URIs and signed URLs are not durable identities. Only DIRECT_SUBJECT photos can be restored under the current persistence policy. Do not claim arbitrary reference-photo restoration until that separately approved contract exists.

Required device QA after integration/deployment: select a supported small image on iOS and Android; send it alone, with product text and with “Sí” after a summary invitation; confirm the AI visibly uses the image. Remove a preview before sending; try an unsupported/oversized image; interrupt an upload and retry; send from review through CONTINUE; switch profiles during an upload. Confirm one draft/turn and no duplicate publication. Test resume/expired signed URLs with Bug 14 once available. Existing server-side Storage uploads occur before the draft write, so a later failure or partial multi-image upload can leave orphan objects; retry identity protects completed requests but does not make Storage and DB writes atomic. This pre-existing cleanup limitation is unchanged.
