# Luppit — Codex Context, Debug Installation, and End-to-End QA Guide

> Prepared from the application, Edge Functions, and database repositories on 2026-08-04. This is a testing guide and a source map, not proof that any particular deployment matches the checked-out code. José must provide the exact release manifest in §1 before testing starts.

## How Maureen, Fhyto, and their Codex should use this file

Feed this entire file to Codex at the beginning of the testing task. Give Codex read access to all three repositories at the exact commits in the release manifest. Then tell it:

```text
You are my Luppit QA copilot. Treat this guide as the product and test map, but verify
claims against the exact checked-out commits and the observed build. Help me execute
the test campaigns, keep a coverage ledger, inspect only the relevant code/database
contracts, and turn each failure into a reproducible bug report.

Do not excuse unexpected behavior just because the code currently implements it.
Distinguish expected behavior, a documented limitation, a contract discrepancy, and
a new defect. Never expose tokens, OTPs, phone numbers, email addresses, message text,
signed URLs, or other sensitive data in prompts, logs, screenshots, or reports. Never
mutate production data directly. Ask José before any destructive or production action.
```

Codex should use this order of authority when sources disagree:

1. The target test environment and its observed RPC responses.
2. The release manifest and the exact committed versions in all three repositories.
3. The database's ordered migrations; later migrations override earlier definitions.
4. Scoped `AGENTS.md` files nearest the app code being inspected.
5. Generated database types and service contracts.
6. `seed.sql` only as reference-data intent, never as a complete current schema.

The initial database migration is a snapshot, not the full current behavior. Do not call functions with names such as `*_before_*`, and do not infer a conversation action from a client-side status switch. Current actions, labels, confirmations, permissions, timelines, and visibility are resolved by database RPCs.

---

## 1. Release manifest — José must complete this before sharing

Do not begin formal testing from a dirty worktree or an unspecified branch. Fresh clones cannot reproduce uncommitted files, ignored native projects, or local environment configuration.

```text
Test round name:
App repository commit SHA:
Database repository commit SHA:
Edge Functions repository commit SHA:
Hosted environment name/project:
Database migration version confirmed deployed:
Edge Functions confirmed deployed:
  - ai-completar
  - ai-vendedor-completar
  - send-moderated-conversation-message
Expo dependency compatibility check: pass / explicitly waived with reason
Build type: local development / EAS development
Expo project access granted to:
Apple team/device access granted to:
Test start date:
Known exclusions for this round:
```

José must also provide, through a secure channel:

- GitHub access to the private repositories and the exact SHAs above.
- The five client development environment values, or permission to pull them from EAS.
- Access to test SMS and email OTP delivery.
- A non-production test environment whose database and Edge Functions match the manifest.
- Test categories and seller category preferences that are known to match.
- Permission and isolated fixtures for deadline, safety, and deletion tests.
- A decision on each item in §16, especially buyer-assistant attachments and multi-profile behavior.

Every tester records this before every run:

```text
Tester:
Date/time and time zone:
App commit/build identifier:
Database and Edge release identifiers:
Build type:
Phone model:
OS version:
Role and non-sensitive fixture label:
Network:
Test campaign/case IDs:
```

Never put `.env.local`, access/refresh tokens, service-role keys, OTPs, real personal data, signed Storage URLs, or credentials into Codex, screenshots, videos, or bug reports.

---

## 2. The three-repository mental model

Luppit is an Expo Router React Native application backed by Supabase. The client is intentionally thin in the areas where product behavior is database-driven.

```text
Development/
├── Luppit/                         Mobile application repository
│   ├── app/                        Expo Router screens and route groups
│   ├── src/components/             Shared UI and active-profile infrastructure
│   ├── src/services/               RPC/Edge/service boundaries
│   ├── src/db/                     Typed client-side DB wrappers
│   ├── src/types/database.types.ts Generated Supabase types
│   └── ai-edge-functions/          Separate nested Git repository, ignored by app Git
│       └── supabase/functions/     Deployable Edge Function source of truth
└── luppit-supabase/                Separate sibling database repository
    └── supabase/
        ├── migrations/             Ordered schema/RPC/RLS changes
        ├── seed.sql                Reviewed reference/configuration data
        └── tests/database/         pgTAP contract and lifecycle tests
```

Repository URLs:

```text
https://github.com/Luppit/Luppit.git
https://github.com/Luppit/ai-edge-functions.git
https://github.com/Luppit/luppit-supabase.git
```

The mobile app may keep generated types and the Supabase client, but migrations, seeds, database tests, and database CLI configuration belong only in `luppit-supabase`. Deployable Edge Function code belongs only under `Luppit/ai-edge-functions/supabase/functions`.

### Route map

| Area | Location | Purpose |
|---|---|---|
| Authentication | `app/(auth)` | Phone login/signup, OTP, onboarding |
| Main application | `app/(tabs)` | Home, create, offers, favorites, chats, profile |
| Buyer request assistant | `app/(chat)` | Conversational purchase-request drafting |
| Transaction conversation | `app/(conversation)` | Buyer/seller offer lifecycle and messages |
| Details/accounts | `app/(detail)` | Purchase request, seller, account, timeline/detail surfaces |
| Modals | `app/(modal)` | Email, seller offer, profile/business edits |
| Shared request link | `app/request/[purchaseRequestId].tsx` | Role-aware request deep-link resolver |

### Root bootstrap and gates

At launch, the root composition is:

```text
Theme
  → ActiveProfileProvider / BootstrapGate
  → LegalAcceptanceGate
  → EmailSetupNavigationGate
  → Current route
  → Global popup and toast layers
```

Authentication is phone/SMS OTP. One Supabase Auth user can own multiple buyer/seller profiles. The active profile is selected from device-persisted choice, then the database default, then the first profile. Switching profile keeps the Auth session but aborts profile-scoped requests, clears relevant filters/segments, and remounts role-scoped surfaces.

Important gates:

- Current legal documents must be accepted.
- Email setup is complete only when email, email opt-in, and opt-in timestamp are present.
- A seller also needs required business/category setup before normal discovery.
- Phone is the read-only login identity; email changes use OTP verification.
- Pending request deep links survive auth/profile/email gates and should resume afterward.

Navigation labels, icons, menus, role destinations, segments, marketplace stages, status presentation, and many actions come from database configuration. Do not report a hardcoded English/Spanish string as the oracle without checking the current database response.

---

## 3. Shared installation preparation

### Supported development-build approach

This project includes `expo-dev-client`; formal testing must use a development build, not Expo Go. The project currently uses Expo SDK 54, React Native 0.81.5, the new architecture, bundle/application ID `com.luppit.app`, and custom scheme `luppit://`.

Use Node 22 LTS. It satisfies React Native's minimum Node requirement and current Supabase JavaScript support. Use `npm ci`, not `npm install`, so the lockfile defines dependencies.

**Mandatory release preflight:** the lockfile inspected while this guide was prepared fails Expo SDK 54's local compatibility map for four native packages: `@react-native-community/datetimepicker` 9.1.0 versus expected 8.4.4, `@sentry/react-native` 8.20.0 versus expected `~7.2.0`, `expo-document-picker` 55.0.8 versus expected `~14.0.7`, and `expo-image-picker` 55.0.11 versus expected `~17.0.8`. José must publish a compatible test commit or record an explicit, evidence-backed waiver in the manifest. Testers must not run an automatic fix and thereby create an unreviewed dependency state.

Clone this layout. Replace each `REPLACE_WITH_..._SHA` token with the exact manifest value; do not copy angle-bracket placeholders into a shell.

macOS/Linux shell:

```bash
mkdir -p Development
cd Development
git clone https://github.com/Luppit/Luppit.git
git clone https://github.com/Luppit/luppit-supabase.git
git clone https://github.com/Luppit/ai-edge-functions.git Luppit/ai-edge-functions
git -C Luppit switch --detach REPLACE_WITH_APP_SHA
git -C luppit-supabase switch --detach REPLACE_WITH_DATABASE_SHA
git -C Luppit/ai-edge-functions switch --detach REPLACE_WITH_EDGE_SHA
cd Luppit
npm ci
cp .env.example .env.local
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force Development
Set-Location Development
git clone https://github.com/Luppit/Luppit.git
git clone https://github.com/Luppit/luppit-supabase.git
git clone https://github.com/Luppit/ai-edge-functions.git Luppit/ai-edge-functions
git -C Luppit switch --detach REPLACE_WITH_APP_SHA
git -C luppit-supabase switch --detach REPLACE_WITH_DATABASE_SHA
git -C Luppit/ai-edge-functions switch --detach REPLACE_WITH_EDGE_SHA
Set-Location Luppit
npm ci
Copy-Item .env.example .env.local
```

The required client variables are:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=REPLACE_SECURELY
EXPO_PUBLIC_SUPABASE_ANON_KEY=REPLACE_SECURELY
EXPO_PUBLIC_ENV=dev
EXPO_PUBLIC_SENTRY_ENABLED=false
EXPO_PUBLIC_SENTRY_ENVIRONMENT=development
```

These `EXPO_PUBLIC_*` values are embedded in the client and are not server secrets, but they still should be shared through the agreed secure channel. Never use or distribute a Supabase `service_role` key. Local testing should normally set Sentry disabled unless José explicitly wants the test build reporting to Sentry.

If the testers have the correct Expo project permission and the development values are configured there, they may use:

```bash
npx eas-cli@latest env:pull --environment development --path .env.local
```

Otherwise, fill `.env.local` from José's secure handoff. `EXPO_PUBLIC_ENV` namespaces local session/profile storage, so never leave it empty or reuse the production label for QA.

Validate that the five entries are present without printing their values.

macOS:

```bash
awk -F= '/^EXPO_PUBLIC_/ { value=substr($0,index($0,"=")+1); print $1 ": " (length(value) ? "set" : "EMPTY") }' .env.local
```

Windows PowerShell:

```powershell
Get-Content .env.local | Where-Object { $_ -match '^EXPO_PUBLIC_[^=]+=' } | ForEach-Object {
  $name, $value = $_.Split('=', 2)
  "$name`: $(if ($value) { 'set' } else { 'EMPTY' })"
}
```

Then validate the toolchain before the first build:

```bash
node --version
npm --version
npx expo install --check
npx expo-doctor
```

`expo install --check` must pass or match the manifest's explicit waiver before formal QA. If it reports a mismatch on the target SHA, stop installation and report the exact package/version list to José; do not run `--fix` unless a reviewed dependency change is part of the release.

Do not run database reset, seed, deadline worker, or deletion commands against a hosted environment. The local database workflow in §14 is optional and isolated.

---

## 4. Maureen — iPhone and Mac debug installation

### Prerequisites

- Git and Node 22 LTS.
- Xcode 16.1 or newer with the required iOS platform and Command Line Tools.
- iPhone running iOS 15.1 or newer.
- Homebrew, Watchman, and CocoaPods.
- Access to the Luppit Apple development team for signing `com.luppit.app`.
- Physical iPhone, a data-capable USB cable, and Developer Mode.

Install/verify the Mac native tools:

```bash
brew install watchman cocoapods
watchman --version
xcodebuild -version
pod --version
```

Prepare the phone:

1. Connect and unlock the iPhone; choose **Trust This Computer** when prompted.
2. In Xcode, verify it appears under **Window → Devices and Simulators**.
3. On iOS 16+, enable **Settings → Privacy & Security → Developer Mode**.
4. Restart the phone and confirm Developer Mode.

From the app repository, install the local development build:

```bash
npm run ios -- --device
```

Expo generates the ignored native project, installs pods, builds, installs Luppit, and starts Metro. If signing fails:

```bash
npx expo prebuild --platform ios
open ios/Luppit.xcworkspace
```

In Xcode, select **Luppit → Signing & Capabilities**, enable automatic signing, select the Luppit Apple team, then rerun:

```bash
npm run ios -- --device
```

Do not silently change `com.luppit.app` to solve signing. A Personal Team may not be able to sign that already-owned identifier; adding a separate debug identifier is a deliberate project change for José.

For daily JS/TS testing, keep the installed development client and run:

```bash
npx expo start --dev-client
```

Open the installed Luppit app and connect to Metro. The Mac and phone should be on the same reachable network. If LAN discovery is blocked by VPN, guest Wi-Fi, or client isolation:

```bash
npx expo start --dev-client --tunnel
```

Rebuild after native dependency, Expo plugin, SDK, or `app.json` changes. If a clean native regeneration is required:

```bash
npx expo prebuild --clean --platform ios
npm run ios -- --device
```

`--clean` recreates ignored native files. Do not use it over intentional native edits.

### iOS EAS fallback

This requires Expo-project permission, paid Apple team access, and the device UDID in the provisioning profile:

```bash
npx eas-cli@latest login
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile development
```

Install from the EAS link. Registering a new device requires a rebuilt or re-signed IPA. A development build still connects to Metro for normal use.

### iOS cautions

- Local, EAS, and store builds share `com.luppit.app`; one may replace or conflict with another and change the stored session.
- Uninstalling clears app-local data and SecureStore. Preserve test evidence first.
- Product media behavior uses the photo library. iOS may also show **Local Network** specifically for the development client to discover/reach Metro over LAN. A camera, microphone, location, or push prompt remains unexpected or evidence of a stale native build.

---

## 5. Fhyto — Android and Windows debug installation

Use native Windows PowerShell with Windows Android Studio/ADB. Do not mix the Android SDK on Windows with a WSL build environment.

### Prerequisites

- Git for Windows and Node 22 LTS.
- JDK 17.
- Android Studio.
- Android SDK Platform 36, Build Tools 36.0.0, and Platform Tools.
- Android phone running Android 7/API 24 or newer.
- The NDK can be installed by Gradle; the current generated project requests `27.1.12297006`.
- A data-capable USB cable and, if necessary, the phone manufacturer's Windows USB driver.

In Android Studio **SDK Manager**, install Android SDK Platform 36 and Sources for Android 36. Under **SDK Tools**, enable **Show Package Details** and install Build Tools 36.0.0 plus current Platform Tools, then accept the SDK licenses.

Set the Android SDK location. If Android Studio shows another **Android SDK Location**, substitute that exact path:

```powershell
[Environment]::SetEnvironmentVariable(
  'ANDROID_HOME',
  "$env:LOCALAPPDATA\Android\Sdk",
  'User'
)
```

Add `%LOCALAPPDATA%\Android\Sdk\platform-tools` to the user `Path`, open a new PowerShell window, and verify:

```powershell
java -version
$env:JAVA_HOME
$env:ANDROID_HOME
Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe"
adb --version
```

`java -version` must show JDK 17. If `$env:JAVA_HOME` is empty or points elsewhere, set the user `JAVA_HOME` to the actual Microsoft OpenJDK 17 installation directory and add `%JAVA_HOME%\bin` to `Path`; do not guess the directory.

Prepare the phone:

1. Open **Settings → About phone** and tap **Build number** seven times.
2. Open **Developer options** and enable **USB debugging**.
3. Connect with a data cable and select File Transfer/Data mode if needed.
4. Accept the RSA prompt and optionally choose **Always allow**.
5. Run `adb devices`; the device must say `device`, not `unauthorized` or `offline`.

Install the local development build:

```powershell
npm run android -- --device
```

Expo generates the ignored Android project, creates a local debug signing key, builds, installs, and starts Metro.

For daily JS/TS testing:

```powershell
npx expo start --dev-client
```

If a USB-connected phone cannot reach Metro:

```powershell
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client --localhost
```

Allow Node through Windows Firewall on private networks. Tunnel is the fallback:

```powershell
npx expo start --dev-client --tunnel
```

Rebuild native changes with:

```powershell
npx expo prebuild --clean --platform android
npm run android -- --device
```

If ADB cannot find the phone, try another cable/port and USB mode, install the OEM driver, revoke USB debugging authorizations, then run:

```powershell
adb kill-server
adb start-server
adb devices
```

`INSTALL_FAILED_UPDATE_INCOMPATIBLE` means the installed `com.luppit.app` was signed by another key, often EAS versus local debug. This removes the installed app and all local sessions, so preserve evidence and obtain tester approval first:

```powershell
adb uninstall com.luppit.app
```

### Android EAS fallback

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile development
```

Install the APK from the EAS link, permit **Install unknown apps** if requested, then connect it to local Metro. This requires membership in the existing Expo project.

---

## 6. Product architecture in one end-to-end journey

```text
Buyer signs in and selects an active buyer profile
  → legal and email gates pass
  → buyer creates a server-backed conversational draft
  → draft reaches review and is atomically published as an active request
  → matching seller category preferences make it discoverable
  → seller opening it creates/reuses a conversation and records visualization
  → seller publishes a priced offer with fulfillment methods and photos
  → buyer accepts/rejects; accepting closes competing seller conversations
  → seller confirms the transaction
  → shipping or pickup fulfillment completes
  → both parties may rate
```

Buyer/seller home currently uses `get_buyer_marketplace_hub` and `get_seller_marketplace_hub`, with database-provided stages, counts, attention/unread information, rail items, reasons, actions, and navigation. Older `get_*_home_purchase_requests` wrappers should be treated as legacy/compatibility paths unless the target release proves otherwise.

Buyer visibility is profile-owned and status-driven. Seller visibility additionally depends on the seller's configured business-category preferences matching the request category. In the baseline reference configuration:

- `active` is visible to buyer and seller.
- `offer_accepted` is visible to buyer and seller.
- `canceled` is hidden from both.

Do not hardcode these as eternal rules; query current status/config metadata.

---

## 7. Buyer purchase-request creation

This is not a normal client form. It is a server-backed conversational draft handled by the `ai-completar` Edge Function.

### Normal flow

1. A buyer sends a natural-language need.
2. The client posts to `/functions/v1/ai-completar` with the active profile, a fresh request/idempotency identity, optional `draft_id`, and optional explicit UI action.
3. The first successful response creates/returns a `request_draft`; every later turn must preserve its `draft_id`.
4. The server derives the category, item information, location, budget, attributes, and notes.
5. The current leaf category and its `category_requirement` rows define what is missing. The client does not own this definition.
6. When ready, the assistant can request a summary. `SHOW_SUMMARY` enters review.
7. The buyer may `CONTINUE` editing. Typing while review is visible first exits review, then sends the new text.
8. `PUBLISH` calls database RPC `publish_purchase_request`.
9. Publication atomically inserts one active `purchase_request` and marks the draft published with the resulting request ID.
10. `/request/[purchaseRequestId]` opens the buyer detail. A matching seller can discover the request.

Core data:

```text
request_draft
request_draft_message
purchase_request
purchase_request_status
category
category_requirement
```

Important boundaries to test:

- Edge prompt maximum: 4,000 characters. The shared composer may visually allow more.
- Edge supports up to three images at 2 MB each, but the scoped buyer contract says the assistant should be text-only. See §16.
- Rate limits currently distinguish UI actions, images, and text (60/min, 12/min, 30/min respectively).
- Expected transient failures include 429 with retry guidance and 503/model unavailability.
- Server-side work may finish after the client Stop control aborts its fetch.
- A manual retry receives a new invocation identity; ambiguous network loss must be checked for committed server state.
- Draft rows are durable, but the chat UI currently does not restore an existing draft after route unmount/app restart.

Success oracle: one and only one request exists for the draft; draft/request ownership matches the active buyer profile; draft is `published`; the request category/contract is the reviewed one; visibility is correct for matching and nonmatching sellers.

---

## 8. Seller discovery, conversation creation, and offer creation

A seller needs business/category setup. Opening a visible request calls `get_or_create_seller_purchase_request_conversation`:

- It validates the owned seller profile, business membership, legal/safety/self-interaction rules, and request existence.
- It records visualization without multiplying it on normal reopen.
- It reuses the seller's existing request conversation when present.
- Otherwise it creates `REQUEST_OPENED`, history, and the first request-summary message.

The current RPC does **not** itself enforce seller-home category matching or request-status visibility before creating the visualization/conversation. The home UI normally supplies a visible request, but direct RPC/custom-link access to a nonmatching or hidden/canceled request is a required contract test.

New offers use the `ai-vendedor-completar` Edge Function. This is a conversational offer assistant, not the same flow as editing an existing offer.

The current client publish UI requires:

- A preserved `offer_draft_id`.
- Positive pricing in a live catalog currency.
- Price basis and quantity consistency.
- Pickup, shipping, or both. Day counts are whole numbers; monetary values and quantity are positive numeric values, and fractional quantity needs an explicit product decision.
- At least one photo the client believes succeeded.
- Currently up to six photos per assistant message, 3 MB each, JPG/PNG/WebP/GIF at the Edge input boundary.

Photo presence is not currently a server/database invariant: a direct Edge `PUBLISH` can create a zero-photo offer. The client also increments its successful-photo count from submitted images when the overall turn succeeds, not from confirmed persisted offer images, so an image rejected by product-image selection can incorrectly unlock Publish. Treat “at least one real product photo” as product intent with two separate enforcement tests, not a proven backend guarantee.

The publish path creates the offer and fulfillment rows, links it to the conversation, moves `REQUEST_OPENED → OFFER_MADE`, and adds the canonical history/messages. Repeated publish after an ambiguous response must not create a second offer.

Editing an existing offer loads `get_seller_offer_edit_payload_v2` and uses a structured editor. It can update price/basis/quantity, keep/add/remove images, and replace shipping/pickup methods independently. Successful update stays `OFFER_MADE` and should notify/refresh the buyer without adding a false lifecycle transition. After buyer selection, accepted fulfillment details are immutable.

Like the buyer flow, an unsent seller transcript, `offer_draft_id`, and local photo count are not restored after leaving/killing the screen. Reopening with only the conversation ID can create another unsent draft, and pending images can become orphaned. This is a required interruption/recovery test.

Distinguish these outcomes:

- Seller **cancels offer**: normally resets an eligible conversation to `REQUEST_OPENED`, removes/unlinks the offer graph, and leaves the request active. An eligible old empty conversation may instead be purged entirely; any buyer notification must then navigate to the request without a dangling conversation reference.
- Buyer **rejects offer**: ends that seller conversation as `OFFER_REJECTED`; request stays active.
- Seller **discards request**: ends the seller conversation as `REQUEST_DISCARDED`; request stays active.
- Buyer **cancels request**: request-level operation that moves all related conversations to `REQUEST_CANCELED` when still eligible.

---

## 9. Conversation system and transitions

The conversation screen renders database metadata. Its source of truth is `get_conversation_view`; messages come from `get_conversation_messages`; actions execute the database-provided executor, currently the generic `execute_conversation_action`; the timeline comes from `get_conversation_timeline`.

Executable UI slots are `TOP`, `AUX`, and `MENU`. `STATUS` is passive thread content. Codex must inspect the returned actions, confirmation template/inputs, role rules, labels, styles, and executor instead of reconstructing them from this table.

### Logical lifecycle

The current transition oracle contains 41 allowed rows because some logical actions have base/menu variants and hidden system/request-cancellation paths. The compact logical model is:

| Current status | Meaning and chat permission | Valid logical exits |
|---|---|---|
| `REQUEST_OPENED` | Seller opened request; no peer chat | Seller creates offer → `OFFER_MADE`; seller/system discards → `REQUEST_DISCARDED`; request cancellation → `REQUEST_CANCELED` |
| `OFFER_MADE` | Offer sent; buyer and seller may chat | Buyer accepts → `OFFER_ACCEPTED`; buyer rejects/sibling closure → `OFFER_REJECTED`; seller cancels offer → `REQUEST_OPENED`; seller edits → same status; request cancellation → `REQUEST_CANCELED` |
| `OFFER_ACCEPTED` | Buyer selected offer; no peer chat | Seller confirms → `SELLER_ACCEPTED`; eligible buyer cancel or seller discard → `FINALIZED`; request cancellation cleanup → `REQUEST_CANCELED` |
| `SELLER_ACCEPTED` | Seller confirmed fulfillment; no peer chat | Seller proceeds/finalizes → `SENT_SHIPMENT`; deadline → `DELAYED_ACCEPTANCE` |
| `DELAYED_ACCEPTANCE` | Post-Concretar fulfillment deadline was missed; both may chat | Seller proceeds → `SENT_SHIPMENT`; buyer cancels → `FINALIZED` |
| `SENT_SHIPMENT` | Shipping is in progress, or pickup internal completion step; both may chat | Buyer received → `FINALIZED`; pickup internal finalize → `FINALIZED`; deadline → `DELAYED_SHIPMENT` |
| `DELAYED_SHIPMENT` | Shipping deadline missed; buyer may chat, seller may not | Buyer received or not received → `FINALIZED` |
| `FINALIZED` | Terminal transaction; no peer chat | Ratings may be available independently to each participant |
| `OFFER_REJECTED` | Terminal rejected/nonselected offer | No normal transaction action |
| `REQUEST_DISCARDED` | Terminal seller discard | No normal transaction action |
| `REQUEST_CANCELED` | Terminal buyer request cancellation | No normal transaction action |
| `PARTICIPANT_DELETED` | Retained counterpart history after deletion | Noninteractive terminal state |

Hidden cleanup transitions from terminal offer/discard states can be used by request-level cancellation; their presence does not mean the UI should expose a cancel action there.

### Buyer accepts an offer

The database locks request, sibling conversations, offer, and methods. A single method auto-selects. If both pickup and shipping exist, the client must submit the explicit current method and offer revision. A stale revision returns `offer_changed`; it must never accept a mixture of old/new price and fulfillment data. Pickup requires a verified opted-in buyer email.

On success:

- Selected conversation becomes `OFFER_ACCEPTED`.
- Request becomes `offer_accepted`.
- Selected fulfillment is captured and locked.
- Sibling `REQUEST_OPENED` conversations become `REQUEST_DISCARDED`.
- Sibling `OFFER_MADE` conversations become `OFFER_REJECTED`.
- History, role-targeted messages, notifications, detail, and timeline reflect the same choice.

### Deadlines and shipping

- `SELLER_CONCRETAR_EXPIRATION`: despite the catalog name, this is the fixed three-day post-Concretar fulfillment deadline; it moves `SELLER_ACCEPTED → DELAYED_ACCEPTANCE` when shipping was not performed or pickup was not completed in time.
- `SENT_SHIPMENT_EXPIRATION`: selected shipping maximum days; moves `SENT_SHIPMENT → DELAYED_SHIPMENT` when due.

The deadline processor is expected hourly in the deployed runtime. Test it only in an approved isolated environment. At deadline boundaries, a user action and worker race must produce one valid state and one logical transition, not duplicates.

Shipping path:

```text
OFFER_ACCEPTED
  → seller confirms/concretar
SELLER_ACCEPTED
  → seller sends/finalizes shipping
SENT_SHIPMENT
  → buyer confirms received
FINALIZED
```

Late variants pass through `DELAYED_ACCEPTANCE` or `DELAYED_SHIPMENT`. “Not received” becomes available only after delayed shipment, and still terminates in `FINALIZED` with the correct semantic timeline.

### Pickup OTP

For selected pickup, the buyer can request a four-digit email code only when the pickup window is available and state is eligible. The code is hashed in the database, expires after ten minutes, has a 60-second resend cooldown and five sends/hour, is bound to its conversation, and locks after five wrong attempts. A new code invalidates the old one.

The seller submits the buyer-provided code. A valid submission completes exactly once; internal state may briefly use `SENT_SHIPMENT`, but the public pickup timeline should collapse that implementation step. Never capture, log, or screenshot the plaintext code.

### Messages and realtime

Messages are sent only through `send-moderated-conversation-message`, never by direct authenticated table insert. Text and each selected image are moderated; image uploads are private, JPG/PNG/WebP, up to 4 MB each. A failed image moderation/upload must not leave an accessible orphan.

Reading messages through `get_conversation_messages` marks only visible, non-system messages from the other participant as opened. Role-targeted system messages are filtered; system messages do not use peer read receipts.

Realtime broadcasts are invalidation signals on private topic `conversation:<id>`, event `conversation_changed`. The client debounces and refetches canonical view/messages. Raw broadcast payloads are never the state oracle. Reconnect, background, duplicate, and out-of-order events must converge to database state.

### Ratings, safety, and deletion

After `FINALIZED`, buyer and seller receive their own rating action until each submits. Buyer ratings update seller profile/business summaries; seller ratings update buyer profile summary. A sequential duplicate is rejected/stable and adds no lifecycle history. Current SQL does not guarantee that two truly simultaneous submissions by the same rater cannot overwrite, so that race is a required defect-detection case.

Report, block, unblock, and help are database-driven. Blocking disables chat/attachments and ordinary actions but must preserve structured actions needed to resolve an active transaction. Current legal acceptance is checked again by the action dispatcher. Deletion can retain a counterpart-safe `PARTICIPANT_DELETED` conversation without exposing deleted personal data.

---

## 10. Where Codex should look in the database

### Core tables by concern

| Concern | Tables |
|---|---|
| Buyer draft/request | `request_draft`, `request_draft_message`, `purchase_request`, `purchase_request_status`, `purchase_request_status_ui`, `category`, `category_requirement`, `purchase_request_visualization` |
| Seller offer | `offer_draft`, `offer_draft_message`, `purchase_offer`, `purchase_offer_image`, `purchase_offer_delivery_method`, `purchase_offer_pickup_method`, `delivery_catalog`, `currency` |
| Conversation state/config | `conversation`, `conversation_status`, `conversation_transition`, `conversation_status_history`, `conversation_status_role_rule`, `conversation_status_role_action`, `conversation_action`, `conversation_action_executor` |
| Confirmations | `conversation_confirmation_template`, `conversation_confirmation_template_condition`, `conversation_confirmation_condition_input`, `conversation_confirmation_field` |
| Messages/delivery | `conversation_message`, `conversation_message_kind`, `conversation_message_open_state`, `conversation_deadline`, `deadline_type_catalog`, `otp_code`, `otp_type_catalog` |
| Trust/notifications | `conversation_rating`, `profile_rating_summary`, `business_rating_summary`, `notification`, `profile_notification`, `notification_type_catalog`, `safety_block`, `conversation_safety_report` |

### Core RPCs

```text
publish_purchase_request
get_buyer_marketplace_hub
get_seller_marketplace_hub
get_or_create_seller_purchase_request_conversation
get_conversation_view
get_conversation_messages
get_current_profile_conversations
execute_conversation_action
get_conversation_timeline
get_seller_offer_edit_payload_v2
create_seller_offer_priced_fulfillment_from_conversation
update_seller_offer_fulfillment_from_conversation
get_buyer_purchase_request_offers
get_current_seller_purchase_offers
get_current_buyer_purchase_request_cancellation_eligibility
cancel_current_buyer_purchase_request
process_expired_conversation_deadlines
```

The priced offer wrapper delegates to a normalized base contract; the wrapper used by the current Edge flow is the public behavior to trace. The generic conversation executor may replace older seeded executor names in later migrations.

### Safe evidence queries

Use only an approved read-only role/project and replace fixture UUIDs. Select the minimum columns needed; do not export message content, emails, phone numbers, OTPs, or signed URLs.

```sql
-- Buyer draft → one published request
select id, profile_id, status, ui_state, pending_action, purchase_request_id, updated_at
from public.request_draft
where id = 'DRAFT_UUID';

select id, profile_id, draft_id, status, published_at
from public.purchase_request
where draft_id = 'DRAFT_UUID';

-- Conversation lifecycle oracle for one test transaction
select id, purchase_request_id, buyer_profile_id, seller_profile_id,
       purchase_offer_id, status_code
from public.conversation
where id = 'CONVERSATION_UUID';

select from_status_code, to_status_code,
       action_id, actor_profile_id, created_at
from public.conversation_status_history
where conversation_id = 'CONVERSATION_UUID'
order by created_at, id;

-- Message metadata only; omit text/image paths from shared artifacts
select id, message_kind, sender_profile_id, created_at
from public.conversation_message
where conversation_id = 'CONVERSATION_UUID'
order by created_at, id;

select id as conversation_id, deadline_type, due_at, resolved_at
from public.conversation_deadline
where id = 'CONVERSATION_UUID';

select conversation_id, rater_profile_id, rated_profile_id, stars, created_at
from public.conversation_rating
where conversation_id = 'CONVERSATION_UUID';
```

Column names can change; let the exact release's generated types/migrations correct a query instead of guessing. Currency is especially important: later migration intent renames a legacy catalog code while older seed text may still show it. Assert against the running catalog, not a hardcoded static seed value.

### Database tests worth using as oracles

Under `luppit-supabase/supabase/tests/database/`:

```text
application_rpc_contract
conversation_transition_oracle
seller_open_and_offer_create
seller_offer_update_and_cancel
buyer_accept_offer
buyer_accept_fulfillment_contract
buyer_reject_and_seller_discard
seller_concretar_and_buyer_cancel
shipping_completion_and_deadlines
pickup_otp_completion
conversation_messages_and_visibility
conversation_ratings
purchase_request_cancellation_lifecycle
seller_opportunity_discovery
business_team_management
safety
notification/read/dismiss tests
legal/account deletion tests
storage hardening tests
```

The database README historically reported 813 passing assertions across 27 files on 2026-07-29. Later migrations exist, so that statement is not proof that the target SHA passes now. Run the exact target suite locally before treating it as verified.

---

## 11. Test data and two-device campaign design

Do not put buyer and seller roles on the same Auth user for the core buyer-assistant flow: the current client rejects multi-profile accounts. Keep multi-profile coverage in a separate fixture.

Prepare these isolated fixture labels:

- **Buyer A**: exactly one buyer profile, current legal/email setup, SMS and email access.
- **Seller A Owner**: exactly one seller profile, business, location, category matching Buyer A.
- **Seller A Member**: invited member of a test business, for owner/member permission differences.
- **Buyer B** and **Seller B**: fresh single-profile accounts used when roles/platforms swap.
- **Seller C**: competing offer on the same request.
- **Nonmatching Seller**: category preference must not match the request.
- **Multi-profile Account**: buyer + seller profiles, used only for switching/isolation tests.
- **Incomplete Email Account** and **Unaccepted Legal Account**.
- **Safety Pair**: accounts that may report/block/unblock each other.
- **Deletion Accounts**: disposable and isolated; never reuse shared business-owner data.
- Prebuilt conversations in every current status when natural timing/setup is impractical.

Each fixture account needs its own reachable test phone number and, wherever email OTP/pickup is exercised, its own reachable test email. Reserve OTP/rate-limit budget before a campaign; do not intentionally rate-limit the shared happy-path accounts.

Run the campaigns in this order:

### Campaign A — iOS buyer, Android seller, shipping

Maureen uses Buyer A; Fhyto uses Seller A. Create a request, discover it, send the primary offer, accept shipping, rate, and verify all lists/notifications. Use separate requests/conversations for the normal, post-Concretar-late, shipment-late, and exact worker-race branches; one transaction cannot prove mutually exclusive paths.

### Campaign B — roles swapped, pickup

Fhyto uses Buyer B; Maureen uses Seller B. Repeat creation/discovery, select pickup, exercise pickup availability and OTP variants, complete, and rate. This gives both platforms buyer and seller coverage.

### Campaign C — competing sellers and concurrency

Seller C makes a competing offer. Use two clients/sessions to accept/update/cancel at nearly the same time. Verify sibling closure, selected fulfillment, notification targeting, and idempotency. Buyer + Seller A + Seller C are three actors: create Seller C's offer beforehand when only two physical phones are available, or add a third client/simulator for genuinely concurrent three-actor coverage.

### Campaign D — account, safety, and destructive isolation

Use dedicated multi-profile, invitation, incomplete-gate, safety, and deletion fixtures. Never mix destructive tests with A/B/C.

---

## 12. Test execution rules and bug evidence

For every case:

1. Record preconditions and fixture labels.
2. State the user-visible expectation and the database oracle before acting.
3. Capture both devices when a transition affects both users.
4. Record the safe IDs needed for correlation: draft, offer draft, request, offer, and conversation IDs.
5. Verify UI, canonical RPC refresh, persisted rows/history, unread/notification behavior, and restart/reconnect state.
6. Repeat once only when the failure could be timing-related; record frequency instead of hiding flakiness.
7. Clean up only through normal app behavior or an approved isolated fixture script.

### Bug report template

```text
Title: [Area] concise unexpected result
Severity: P0 / P1 / P2 / P3
Release manifest/build:
Tester/device/OS:
Role and fixture label:
Network and app lifecycle state:
Preconditions:
Steps:
Expected user-visible result:
Expected database/RPC oracle:
Actual result:
Frequency:
Safe correlation IDs:
Timeline/date and time zone:
Screenshots/video/log references:
Read-only database evidence:
Likely subsystem (client / Edge / DB / Realtime / Auth / Storage / unknown):
Privacy check completed: yes/no
```

Severity:

- **P0**: security/privacy breach, destructive data loss, account takeover, or core marketplace impossible for all testers.
- **P1**: major lifecycle branch impossible, authorization isolation failure, duplicate money/transactional state, cross-user leakage, or consistent platform blocker.
- **P2**: localized feature/branch defect with a viable workaround, incorrect count/filter/timeline, recoverable failure.
- **P3**: cosmetic, copy, spacing, or low-impact polish issue.

Edge diagnostics live in Supabase Edge Function logs; RPC/cron failures in Postgres logs; subscriptions in Realtime tooling; auth and Storage have their respective logs. Sentry should follow the repository's no-PII observability policy. Correlate safe request/provider request IDs only. Never capture prompts, message bodies, email, phone, OTP, sessions, or signed URLs.

---

## 13. End-to-end test inventory

Mark every item **Pass**, **Fail**, **Blocked**, or **Not in release**, and attach a test-run ID. “Not in release” needs José's approval.

For release triage, treat install/session, authorization, request publication, offer integrity, lifecycle transitions, fulfillment, privacy, and all concurrency/idempotency cases as P0/P1 coverage. Lists, account administration, deep links, recovery, and cross-platform behavior are P1 unless their failure is purely cosmetic. Accessibility/polish findings may be P2/P3, but still remain in the ledger.

### ENV — install, launch, and session

- [ ] ENV-01 Fresh clone at exact three SHAs; `npm ci`; no dependence on José's ignored native directories.
- [ ] ENV-02 `.env.local` development values load; wrong/missing URL or anon key fails clearly without exposing values.
- [ ] ENV-03 `npx expo install --check` passes on the target SHA or exactly matches an approved manifest waiver.
- [ ] ENV-04 First physical-device native build installs on iPhone/Mac.
- [ ] ENV-05 First physical-device native build installs on Android/Windows.
- [ ] ENV-06 Existing development client reconnects to Metro after restart without native rebuild.
- [ ] ENV-07 Cold launch, force-kill, foreground/background, and device restart preserve a valid session.
- [ ] ENV-08 Sign-out clears the correct session; a later login cannot see the prior active profile's cached data.
- [ ] ENV-09 Local/EAS signing conflict and uninstall/session-loss behavior are understood and documented.
- [ ] ENV-10 Product media behavior uses the platform photo picker/library; iOS development builds may additionally request Local Network for Metro. Camera/microphone/location/push prompts are defects or stale native builds.
- [ ] ENV-11 Light/dark automatic theme, portrait layout, splash, and startup gates work on both devices.

### AUTH — signup, login, legal, and email

- [ ] AUTH-01 New buyer signup with valid phone/SMS OTP and current legal acceptance.
- [ ] AUTH-02 New seller signup plus required business/admin setup.
- [ ] AUTH-03 Existing-user login and registered/unregistered phone routing.
- [ ] AUTH-04 Invalid/duplicate phone, wrong/expired/reused OTP, resend cooldown, provider/rate-limit response.
- [ ] AUTH-05 Background/kill/reopen during phone OTP does not bypass or corrupt state.
- [ ] AUTH-06 No-profile and incomplete-profile repair paths.
- [ ] AUTH-07 Legal gate blocks current features until accepted; a newly required legal version re-gates correctly.
- [ ] AUTH-08 Email setup gate requires address + opt-in + timestamp; it resumes the intended pending route afterward.
- [ ] AUTH-09 Email add/change: correct, wrong, expired, resent, and reused email OTP.
- [ ] AUTH-10 Phone stays read-only in account settings.
- [ ] AUTH-11 Auth/profile A cannot submit an owned-ID parameter belonging to profile B.
- [ ] AUTH-12 Offline/slow launch at bootstrap recovers after reconnect and does not remain permanently blank.
- [ ] AUTH-13 Leave a session idle until token refresh is needed; foreground online, foreground offline after expiry, then reconnect without infinite bootstrap or cross-profile leakage.

### PROFILE — multi-profile, business, and account

- [ ] PROF-01 Add buyer and seller profiles; select active profile; selected profile survives restart.
- [ ] PROF-02 Switch profile while home/list/detail requests are running; old results never appear in new profile.
- [ ] PROF-03 Switching clears/isolates home filters, favorites, unread counts, chats, offers, notifications, and badges.
- [ ] PROF-04 Buyer-assistant behavior on a multi-profile Auth account matches the explicit release decision.
- [ ] PROF-05 Edit display name and allowed identity fields; invalid/duplicate values are handled.
- [ ] PROF-06 Seller business categories and Costa Rica province/canton/district dependencies save and drive discovery.
- [ ] PROF-07 Home-location presets and other DB-driven preferences persist and isolate by profile.
- [ ] PROF-08 Business invitation accept, decline, revoke, member remove, and expired/invalid invite.
- [ ] PROF-09 Owner versus member permissions; last owner/removal constraints; history remains coherent.
- [ ] PROF-10 Profile/business images, if included in manifest: replace/remove, invalid/oversize; iOS full/limited/denied access; modern Android system-picker behavior without assuming a durable media permission.
- [ ] PROF-11 FAQ, support, legal pages, and version/reacceptance behavior.
- [ ] PROF-12 Sign-out, profile deletion, and full account deletion use only disposable fixtures and enforce OTP/last-profile/business constraints.
- [ ] PROF-13 Deleted participant history is safe, noninteractive, and labeled through `PARTICIPANT_DELETED` where retention applies.

### NAV/HOME — database-driven discovery

- [ ] HOME-01 Buyer and seller receive correct DB-configured tabs, labels, icons, ordering, and destinations.
- [ ] HOME-02 Buyer hub stages, overview counts, attention/unread, rail, see-all navigation, and empty states.
- [ ] HOME-03 Seller hub equivalents plus required category setup gate.
- [ ] HOME-04 Search, date, category, status, interaction, segment, pagination, and sort combinations; reset each filter.
- [ ] HOME-05 Buyer sees only owned requests appropriate to current status metadata.
- [ ] HOME-06 Matching seller sees the active request; nonmatching seller does not.
- [ ] HOME-07 `offer_accepted` and `canceled` visibility match current database configuration.
- [ ] HOME-08 Slow/error/offline/retry states do not mix prior profile/filter results.
- [ ] HOME-09 Seller Create route is absent or meaningful according to the release decision; placeholder exposure is reported.
- [ ] HOME-10 Currency sort/filter labels match the live currency catalog, including any legacy code migration.

### REQ — buyer request assistant and publication

- [ ] REQ-01 Vague Spanish request produces relevant clarification; one-word and incremental answers update the same draft.
- [ ] REQ-02 Leaf-category requirements drive missing fields; non-leaf, ambiguous, unsupported, and changed category behave safely.
- [ ] REQ-02A A structurally complete category draft still fails readiness when meaningful item detail is insufficient, then becomes ready after useful detail.
- [ ] REQ-03 Change category after completing category-specific fields; stale attributes do not leak into the published contract.
- [ ] REQ-04 FAQ/out-of-scope content does not corrupt the draft.
- [ ] REQ-05 Natural yes/no/control phrases map correctly; explicit `SHOW_SUMMARY`, `CONTINUE`, `PUBLISH` work.
- [ ] REQ-06 Review card accurately represents category, details, location, budget, and attributes.
- [ ] REQ-07 Continue editing, including typing directly while review is shown, returns to a new correct summary.
- [ ] REQ-08 Publish produces one active request and one draft→request link; buyer detail opens.
- [ ] REQ-09 Double-tap and parallel publish; identical replay; conflicting identity; already-published draft.
- [ ] REQ-10 Matching/nonmatching seller visibility after publish; buyer home/detail refresh.
- [ ] REQ-11 Signed-out, seller-role, no-profile, unaccepted-legal, and incomplete-email attempts are gated.
- [ ] REQ-12 Switch active profile during a request; owned draft cannot be used from another profile.
- [ ] REQ-12A Open/send from an account that already owns two profiles while a valid buyer profile is active; record the current client block against the release decision.
- [ ] REQ-13 Leave route and reopen; kill/restart mid-draft; record current non-restoration behavior against release decision.
- [ ] REQ-14 Stop a slow response, then inspect whether server committed; retry must not create confused parallel drafts.
- [ ] REQ-15 Offline before send; disconnect before/after server commit; timeout; malformed response; session expiry/401.
- [ ] REQ-16 Invalid/unowned/missing draft errors; idempotency conflict; rate limit/429; model unavailable/503; 500 recovery.
- [ ] REQ-16A After the composer clears on send, force 400/401/429/503/network failure; the tester can recover the exact prompt without accidental duplicate/new-draft behavior.
- [ ] REQ-17 Prompts at 4,000 and 4,001 characters expose no client/server mismatch without a clear error.
- [ ] REQ-18 Buyer attachment button visibility matches decision. If enabled, test 0/1/3/4 images, image-only, 2 MB boundary, MIME, permission, upload failure.
- [ ] REQ-19 Cancel request before offers, with offers, after acceptance while eligible, and after seller confirmation when ineligible.
- [ ] REQ-20 Request favorite/share/detail/category/seller/timeline/visualization behavior and cancellation confirmation.

### SELL — request open and offer

- [ ] SELL-01 Open/reopen request: same conversation reused; expected visualization behavior; first summary; unowned seller/profile denied.
- [ ] SELL-01A Direct-RPC/custom-link open for nonmatching-category and hidden/canceled requests; report any conversation/visualization creation against the release decision.
- [ ] SELL-02 Two seller sessions open the same request concurrently; no duplicate conversation or unintended visualization.
- [ ] SELL-03 AI offer assistant preserves one `offer_draft_id`; summary/continue/publish controls.
- [ ] SELL-04 Publish shipping-only, pickup-only, and both; free/paid shipping; unit/total price basis and quantity.
- [ ] SELL-05 Valid live currencies and formatting; zero/negative price/quantity and invalid currency rejected; fractional days rejected; fractional money/quantity handled according to an explicit product rule.
- [ ] SELL-06 UI no-photo publish is blocked, then direct Edge `PUBLISH` verifies whether the backend also enforces it; 1 and 6 accepted, 7 rejected; below/at/above 3 MB; JPG/PNG/WebP/GIF/unsupported.
- [ ] SELL-06A Submit a non-product/reference image that image policy rejects; it must not increment a persisted-photo oracle or unlock publish.
- [ ] SELL-07 Photo-library full/limited/denied/permanently denied; interrupted upload and pending-object cleanup.
- [ ] SELL-08 Double publish, response loss then retry, app kill after upload; one offer, no duplicate transition or orphan draft/image.
- [ ] SELL-08A Leave/kill an unsent offer draft and reopen the same conversation; inspect duplicate drafts, lost transcript/photo count, and orphan pending images.
- [ ] SELL-09 Edit description, price/basis/quantity, keep/remove/add photos, replace pickup/shipping independently.
- [ ] SELL-10 Offer edit adds the intended buyer message/notification/realtime refresh but no fake lifecycle history.
- [ ] SELL-11 Simultaneous edit and buyer accept yields a consistent accepted revision or `offer_changed`, never mixed values.
- [ ] SELL-12 Accepted selected fulfillment/images/pricing locks match current contract.
- [ ] SELL-13 Seller cancel offer versus seller discard request versus buyer reject produce the three distinct outcomes.
- [ ] SELL-14 Seller standalone offer list: search/date/status/category/currency/sort/pagination/empty/error.
- [ ] SELL-15 Cancel an eligible old empty offer conversation: if purged, notification/deep-link returns to the request and no dangling conversation/history reference remains.

### CONV — messaging, actions, notifications, and realtime

- [ ] CONV-01 For every status in §9, chat permission exactly matches role/status rules; direct-table bypass denied.
- [ ] CONV-02 Buyer and seller send normal, empty, long, special-character, rapid, and duplicate text.
- [ ] CONV-03 Conversation images: JPG/PNG/WebP, 4 MB boundary, unsupported type, multiple-image partial failure, cleanup.
- [ ] CONV-04 Moderation rejection is understandable and does not create a visible message/orphan object.
- [ ] CONV-05 Opposite-party non-system messages become opened on read; system messages and hidden role-targeted messages do not.
- [ ] CONV-06 Chat list counterpart name, separate request title, unread-first and last-message ordering, search/date/category filters.
- [ ] CONV-07 Exercise every returned `TOP`, `AUX`, and `MENU` action plus passive status/deadline card; cancel then confirm dialogs.
- [ ] CONV-08 Labels, icons, styles, confirmations, inputs, and action ordering come from the current RPC/configuration.
- [ ] CONV-09 Foreground realtime; background return; peer offline then reconnect; force-kill; profile switch.
- [ ] CONV-10 Duplicate/out-of-order/wrong-conversation broadcasts converge after canonical refetch.
- [ ] CONV-11 Disconnect during message send or offer update after possible commit, then retry. Record duplicate message/update artifacts as a current idempotency defect; distinguish these non-idempotent paths from status-gated lifecycle actions.
- [ ] CONV-12 Report/block/unblock/help; blocked party cannot chat/attach but necessary resolution actions remain.
- [ ] CONV-13 Cross-user/profile/business IDs cannot read or mutate conversation, message, timeline, offer, rating, deadline, or notification.
- [ ] CONV-14 Timeline method, labels, reached dates, next step, delay, cancellation, rejection, sibling close, and terminal semantics.
- [ ] CONV-15 In-app notification exact target/type/navigation; unread badge; mark read/dismiss/all; idempotency and profile isolation.
- [ ] CONV-16 Confirm no OS push behavior is expected in this release; unexpected push permission prompts are reported.
- [ ] CONV-17 In two sessions, race a moderated send against accept/reject/cancel/finalize/block. It must commit before the terminal/block transition or be rejected, never insert afterward.

### LIFE — acceptance, competition, shipping, pickup, and rating

- [ ] LIFE-01 Buyer rejects one offer; request remains active; only that conversation is `OFFER_REJECTED`.
- [ ] LIFE-02 One-method offer auto-selects; both methods require explicit choice and current revision.
- [ ] LIFE-03 Pickup acceptance fails atomically without verified opted-in buyer email.
- [ ] LIFE-04 Accept one of multiple sellers: selected conversation/request accepted; every sibling closes correctly.
- [ ] LIFE-05 Simultaneous acceptance from two devices/two sellers results in exactly one selected offer.
- [ ] LIFE-06 Retry acceptance produces no duplicate history/messages/notifications and keeps fulfillment immutable.
- [ ] LIFE-07 Seller concretar preserves/uses the fulfillment selected and locked during buyer acceptance, then creates the correct deadline/history/messages/notification.
- [ ] LIFE-08 Request-level cancellation races with acceptance; acceptance races with concretar; result is one valid serial outcome.
- [ ] LIFE-09 Shipping happy path concretar → sent → received → finalized; detail/timeline/lists/notifications agree.
- [ ] LIFE-10 Post-Concretar `SELLER_CONCRETAR_EXPIRATION` deadline expires once; late seller completion or buyer cancellation resolves correctly.
- [ ] LIFE-11 Shipment deadline expires once; buyer received and not-received branches finalize with distinct semantics.
- [ ] LIFE-12 Run deadline worker twice and race action at exact due time in isolated environment; no duplicated transition/deadline event.
- [ ] LIFE-13 Pickup action hidden before availability; immediate and delayed availability dates/time zones are correct.
- [ ] LIFE-14 Pickup code email delivery; 60-second resend; five/hour; prior code invalidation; 10-minute expiry.
- [ ] LIFE-15 Wrong/malformed code, five-attempt lock, cross-conversation/cross-buyer, expired/reissued, double submit.
- [ ] LIFE-16 Valid pickup completes once; code consumed; internal shipping step collapsed from public timeline; no code in messages/logs.
- [ ] LIFE-17 Buyer/request cancellation and every terminal pickup outcome invalidate any unused code and remove the code action; an old code can never be reused.
- [ ] LIFE-18 Buyer and seller ratings independently appear only after finalization; valid stars/tags/comment.
- [ ] LIFE-19 Invalid and sequential duplicate ratings cannot overwrite; summaries update correct targets; no lifecycle history/notification.
- [ ] LIFE-20 Race two same-rater submissions in separate sessions and report any last-writer overwrite; current SQL has a known concurrency risk here.

### FAV/SHARE — secondary marketplace behavior

- [ ] FAV-01 Buyer and seller add/remove favorite from every supported entry point; counts/lists update.
- [ ] FAV-02 Favorites isolate by active profile and survive restart; removed/unavailable request behavior.
- [ ] FAV-03 Favorites search/filter/sort/pagination/empty/error on both roles.
- [ ] LINK-01 `luppit://request/<id>` in foreground, background, and cold launch on both platforms.
- [ ] LINK-02 Signed-out link resumes after login; incomplete email/profile/legal resumes after gate.
- [ ] LINK-03 Buyer opens detail. For seller, test whether the owning-buyer-only direct request read blocks the intended create/reuse branch; record this known contract discrepancy. Invalid/missing/canceled/unavailable request is safe.
- [ ] LINK-04 Document that HTTP Universal Links/Android App Links and not-installed web fallback are not configured unless release changes it.
- [ ] SHARE-01 Native share sheet creates correct custom-scheme content without leaking private fields.

### PLATFORM — usability, accessibility, and resilience

- [ ] IOS-01 Notch/safe area/home indicator, keyboard avoidance, share sheet, light/dark, photo limited access.
- [ ] IOS-02 VoiceOver order/labels, large text/wrapped rows, reduce motion if applicable, tappable targets.
- [ ] AND-01 Edge-to-edge bars, gesture and three-button navigation, hardware back from popup/modal/detail/chat.
- [ ] AND-02 Keyboard resize, Android media picker, share sheet, TalkBack, large text, at least one OEM variant if possible.
- [ ] PLAT-01 Small/large screen, Spanish locale, Costa Rica dates/time zone, live currency formatting.
- [ ] PLAT-02 Slow/high-latency/intermittent network across lists, assistants, images, messages, actions, OTP.
- [ ] PLAT-03 App background/foreground during assistant, upload, confirmation, OTP, deadline, and realtime transition.
- [ ] PLAT-04 Reconnect refetches missed state; optimistic/transient UI never becomes the persisted oracle.

### SEC/DEL — trust, privacy, and destructive paths

- [ ] SEC-01 BOLA/ID substitution across every role/profile/business boundary returns no foreign data or mutation.
- [ ] SEC-02 Old legal version blocks sensitive action execution, not only route rendering.
- [ ] SEC-03 Report reasons/inputs validate; block/unblock targeting and active-transaction escape paths are correct.
- [ ] SEC-04 Private images require authorized access; signed references expire; failed pending uploads are not publicly accessible.
- [ ] SEC-05 Logs/crashes/bug artifacts exclude tokens, OTPs, phone/email, prompts/messages, signed URLs, personal IDs.
- [ ] DEL-01 Delete non-last profile with OTP; switch/notifications/storage/history cleanup matches policy.
- [ ] DEL-02 Last-profile/full account deletion status/retry/idempotency; use an isolated disposable account.
- [ ] DEL-03 Business owner/member/deletion restrictions protect other members and retained records.
- [ ] DEL-04 Counterparty retained conversation becomes safe `PARTICIPANT_DELETED`; deleted data is not recoverable through RPC/deep link.

---

## 14. Optional local database verification

Only Codex/operators comfortable with Docker and the separate database repository should do this. It creates an isolated local Supabase stack; it is not part of normal phone installation.

From `Development/luppit-supabase`:

```bash
npx -y supabase@2.109.1 start
npx -y supabase@2.109.1 db reset --local
npx -y supabase@2.109.1 seed buckets --local
npx -y supabase@2.109.1 test db supabase/tests/database/*.test.sql
./scripts/deploy-database.sh verify local
```

Run one relevant contract file during diagnosis:

```bash
npx -y supabase@2.109.1 test db supabase/tests/database/conversation_transition_oracle.test.sql
```

The test files create their own Auth/profile/transaction fixtures inside a transaction and roll back. They cannot honestly simulate every multi-session, Storage, Realtime, `pg_net`, and device race. The database README explicitly leaves important integration boundaries for multi-client testing, including concurrent seller conversation creation, send-versus-terminal races, deadline-worker lock ordering, PostgREST overload dispatch, Storage policies, Realtime authorization, and outbound delivery.

If package resolution, Docker, or network access prevents this suite, report it as **not run** with the exact reason. Static inspection is not a passing test.

---

## 15. Completion and exit criteria

A test round is complete only when:

- All P0/P1 inventory items are Pass, approved Not in release, or have an owned defect.
- Both iOS and Android have run as buyer and seller.
- Shipping, pickup, late deadline, competing seller, rejection/discard/cancel, safety, and rating branches are covered.
- Request/offer publication, acceptance, and lifecycle-action retries show no duplicate transactional state; message/offer-update retry defects are explicitly dispositioned.
- Profile/business/user authorization isolation has no leak.
- UI, RPC result, persisted state, history, messages, notifications, timeline, and reconnect outcome agree for every lifecycle case.
- Known discrepancies in §16 have an explicit product/engineering decision.
- No P0 remains open. Every P1 has a documented disposition before release.
- The coverage ledger, bug reports, release manifest, and safe evidence are attached to the round summary.

Suggested summary:

```text
Release manifest:
Devices/platform-role coverage:
Cases Pass / Fail / Blocked / Not in release:
Lifecycle branches covered:
Concurrency/retry cases covered:
Open P0/P1/P2/P3:
Known discrepancies resolved:
Database suite result and date, or not-run reason:
Residual risks:
Release recommendation: Go / No-go / Conditional
```

---

## 16. Known discrepancies and decisions required

These are not instructions to accept a defect. Codex should compare intended contract, actual target code, and observed build, then report the mismatch.

1. **The currently inspected worktree is not a release.** It contains uncommitted profile-picture work and an `app.json` permission change. Native `ios/`/`android/` folders are ignored and can be stale. José must commit/push a reproducible test SHA first.
2. **Expo 54 dependency compatibility currently fails.** The inspected lockfile contains four native versions outside Expo 54's compatibility map. Fix them in a reviewed commit or explicitly waive them with successful build evidence; testers must not silently auto-fix.
3. **Buyer assistant attachment conflict.** `app/(chat)/AGENTS.md` says text-only, but the current layout exposes the shared attachment behavior and supplies `maxImages={3}`; the Edge Function supports images. Decide whether to hide it or treat images as product behavior.
4. **Prompt-length mismatch.** The shared composer may allow 8,000 characters while the Edge Function rejects over 4,000.
5. **Draft restoration gap.** Draft data survives server-side, but the buyer chat does not hydrate it after route unmount/app restart.
6. **Stop/retry ambiguity.** Client abort does not guarantee Edge cancellation; manual retry uses a fresh request identity.
7. **Current home implementation versus older guidance.** The live screen uses marketplace-hub RPCs, while some scoped guidance names older home request RPCs.
8. **Buyer hub signature drift.** Client has a fallback when a sort parameter is absent; confirm deployed RPC signature and generated types.
9. **Seller Create placeholder.** If database navigation exposes the seller Create route, the current screen may only show placeholder content.
10. **Currency catalog drift.** A later migration renames a legacy currency code while older seed content may retain it. Query the target environment.
11. **In-app notifications only.** No `expo-notifications` dependency or native push registration/entitlement is present. Do not test OS push as an implemented feature.
12. **Custom-scheme links only.** `luppit://request/<id>` exists; Universal Links/Android App Links and install fallback are not configured.
13. **Build identity conflict.** Local debug, EAS, and production use `com.luppit.app`, so signer conflict/replacement can erase local session state.
14. **Camera/microphone prompts indicate stale native generation.** Current app configuration intends photo-library access, not camera/microphone.
15. **Static database baseline is historical.** The README's reported 813/27 pass count predates later migrations; run the target SHA.
16. **Message and offer-update retries are not invocation-idempotent.** A response lost after commit followed by a retry can create duplicate message/update artifacts. Lifecycle actions are usually protected by status checks, but do not generalize that protection to sends/updates.
17. **Same-rater concurrent rating race.** Sequential duplicates are stable, but two simultaneous submissions can both pass the existence check and the current upsert may overwrite rating content.
18. **Offer-photo rule is client-only and can be falsely satisfied.** The UI intends one real product photo, but the Edge/RPC permits an empty image array, and local success counting may unlock publish after a policy-rejected image.
19. **Seller request-open RPC does not enforce discovery visibility.** It checks actor/request/safety prerequisites but not category matching or seller-home status visibility; direct access requires a product/security decision.
20. **Seller shared request link likely fails before its seller branch.** The route directly selects a buyer-owned request while current RLS allows only the owning Auth user, so a seller may see not found and never call conversation creation.
21. **Seller unsent drafts are not restored.** Component-local transcript/draft/photo count disappear on remount, and another unsent draft/pending images may remain.

---

## 17. High-value source index

When a failure needs diagnosis, start with the smallest relevant boundary:

```text
App bootstrap/profile:
  app/_layout.tsx
  app/(tabs)/_layout.tsx
  src/components/profile/ActiveProfileContext.tsx
  src/services/active.profile.service.ts

Buyer request:
  app/(chat)/AGENTS.md
  app/(chat)/chat-session.context.tsx
  src/services/purchase.request.assistant.service.ts
  ai-edge-functions/supabase/functions/ai-completar/

Marketplace/request detail:
  app/(tabs)/index.tsx
  app/request/[purchaseRequestId].tsx
  src/services/purchase.request.service.ts

Seller offer:
  app/(modal)/offer.tsx
  src/services/purchase.offer.assistant.service.ts
  src/services/purchase.offer.service.ts
  ai-edge-functions/supabase/functions/ai-vendedor-completar/

Conversation/messages:
  app/(conversation)/AGENTS.md
  app/(conversation)/_layout.tsx
  src/services/conversation.service.ts
  src/services/conversation.message.service.ts
  ai-edge-functions/supabase/functions/send-moderated-conversation-message/

Database contracts:
  ../luppit-supabase/supabase/migrations/
  ../luppit-supabase/supabase/seed.sql
  ../luppit-supabase/supabase/tests/database/
  src/types/database.types.ts

Observability/privacy:
  ai-edge-functions/docs/observability.md
```

Official installation references:

- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo local native development](https://docs.expo.dev/guides/local-app-development/)
- [Using development builds](https://docs.expo.dev/develop/development-builds/use-development-builds/)
- [Expo development-server connection and tunnel troubleshooting](https://docs.expo.dev/get-started/start-developing/)
- [Expo physical iPhone development-build setup](https://docs.expo.dev/get-started/set-up-your-environment/?device=physical&mode=development-build&platform=ios)
- [Sharing development builds](https://docs.expo.dev/develop/development-builds/share-with-your-team/)
- [Expo environment variables](https://docs.expo.dev/guides/environment-variables/)
- [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)
- [EAS internal distribution](https://docs.expo.dev/build/internal-distribution/)
- [Expo iOS Developer Mode](https://docs.expo.dev/guides/ios-developer-mode/)
- [Expo Android Studio, JDK, and SDK setup](https://docs.expo.dev/workflow/android-studio-emulator/)
- [Android physical-device setup](https://developer.android.com/studio/run/device)
- [Android OEM USB drivers](https://developer.android.com/studio/run/oem-usb)
- [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment)
- [React Native 0.81 Node/Xcode requirements](https://reactnative.dev/blog/2025/08/12/react-native-0.81)
- [Apple Local Network privacy](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy)
- [Supabase React Native Auth quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native)

The objective is not merely to tap through screens. It is to prove that two independent physical clients, the current Edge Functions, and the current database converge on one authorized, idempotent transaction state across happy paths, failures, retries, races, and recovery.
