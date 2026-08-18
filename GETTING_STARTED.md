# Run Luppit from a fresh clone

This guide gets the Luppit mobile app running locally after cloning the repository.

Luppit is an Expo/React Native app with custom native modules. **Expo Go is not supported.** The first run must build and install the project's development client on an iOS simulator/device or Android emulator/device.

## 1. Prerequisites

Install these on every development machine:

- [Git](https://git-scm.com/downloads)
- [Node.js 22 LTS](https://nodejs.org/) and npm

React Native requires Node.js 20.19.4 or newer, but Node.js 22 LTS is the project's recommended baseline.

Choose at least one native platform:

### iOS (macOS only)

- Xcode 16.1 or newer, including its Command Line Tools
- CocoaPods
- Watchman (recommended)

With Homebrew:

```bash
brew install cocoapods watchman
```

An iOS simulator does not require Apple signing access. Running on a physical iPhone requires Developer Mode and access to the Apple development team that owns `com.luppit.app`.

### Android (macOS or Windows)

- JDK 17
- Android Studio
- Android SDK Platform 36
- Android SDK Build Tools 36.0.0
- Android SDK Platform Tools

Create and start an emulator in Android Studio, or connect a phone with USB debugging enabled. On Windows, run the Android tools directly in PowerShell rather than through WSL.

## 2. Clone and install

macOS/Linux:

```bash
git clone https://github.com/Luppit/Luppit.git
cd Luppit
npm ci
cp .env.example .env.local
```

Windows PowerShell:

```powershell
git clone https://github.com/Luppit/Luppit.git
Set-Location Luppit
npm ci
Copy-Item .env.example .env.local
```

Use `npm ci`, not `npm install`, for the initial setup so the versions in `package-lock.json` are installed exactly.

## 3. Configure the environment

Ask the repository owner for the **development client environment values** and add them to `.env.local`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=REPLACE_WITH_DEVELOPMENT_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=REPLACE_WITH_DEVELOPMENT_ANON_KEY
EXPO_PUBLIC_ENV=dev
EXPO_PUBLIC_SENTRY_ENABLED=false
EXPO_PUBLIC_SENTRY_ENVIRONMENT=development
```

Important:

- Never put a Supabase `service_role` key in this file. The app only needs the public client/anon key.
- `.env.local` is ignored by Git and must not be committed.
- Restart Metro after changing environment variables.
- `EXPO_PUBLIC_ENV` namespaces local sessions. Keep it non-empty and do not use `production` for local development.

The app connects to a configured Supabase project. Database migrations and seeds live in the separate sibling repository `../luppit-supabase`, while Edge Function source lives in `Luppit/ai-edge-functions`. Neither repository is required merely to run the app against the shared development backend.

## 4. Build and run the app for the first time

### iOS simulator

```bash
npm run ios
```

Expo will generate the ignored `ios/` directory, install CocoaPods, build Luppit, install it in the simulator, and start Metro.

To use a connected physical iPhone instead:

```bash
npm run ios -- --device
```

### Android emulator or device

Start an emulator or connect an authorized phone, then run:

```bash
npm run android
```

If more than one Android target is available, select one explicitly:

```bash
npm run android -- --device
```

Expo will generate the ignored `android/` directory, build Luppit, install it, and start Metro.

The first native build can take several minutes. Later starts are much faster.

## 5. Normal day-to-day startup

After the development client has been installed once, start only Metro for normal JavaScript/TypeScript changes:

```bash
npm start -- --dev-client
```

Then open the installed **Luppit** app in the simulator, emulator, or phone.

Rebuild with `npm run ios` or `npm run android` after changing native dependencies, Expo plugins, or native settings in `app.json`.

## Optional: web preview

```bash
npm run web
```

Web is useful for quick UI checks, but it is not a substitute for the native development client. Native flows such as identity verification must be tested on iOS or Android.

## Verify the checkout

Run these checks after installation:

```bash
npx expo install --check
npm run lint
npm run test:unit
```

Do not run `npx expo install --fix` unless a dependency update is intentional and reviewed.

## Common problems

### The app cannot connect to Supabase

Confirm that all five entries in `.env.local` have values and that the URL/key belong to the development project. Then restart Metro with a cleared cache:

```bash
npm start -- --dev-client --clear
```

### Expo says no development build is installed

Run `npm run ios` or `npm run android` once. Opening the project in Expo Go will not work because Luppit uses custom native modules.

### A physical phone cannot reach Metro

Keep the computer and phone on the same reachable network. VPNs, guest Wi-Fi, and network client isolation can block the connection. As a fallback, use:

```bash
npm start -- --dev-client --tunnel
```

For a USB-connected Android phone, another option is:

```bash
adb reverse tcp:8081 tcp:8081
npm start -- --dev-client --localhost
```

### iOS signing fails

Use a simulator if Apple team access is unavailable. For a physical device, generate the native project and configure automatic signing in Xcode:

```bash
npx expo prebuild --platform ios
open ios/Luppit.xcworkspace
```

Select the Luppit target, open **Signing & Capabilities**, and choose the Luppit Apple development team. Do not change the bundle identifier as a workaround.

### Android cannot find the SDK or device

Verify that JDK 17 is active, `ANDROID_HOME` points to Android Studio's SDK directory, and `adb devices` lists the emulator/phone as `device` rather than `unauthorized` or `offline`.

### The native build became stale

Stop Metro and run the platform build again:

```bash
npm run ios
# or
npm run android
```

The generated `ios/` and `android/` directories are intentionally ignored by Git. Do not commit them.

## Quick command reference

| Task | Command |
| --- | --- |
| Install exact dependencies | `npm ci` |
| First iOS build | `npm run ios` |
| First Android build | `npm run android` |
| Start Metro after the first build | `npm start -- --dev-client` |
| Start Metro through a tunnel | `npm start -- --dev-client --tunnel` |
| Web preview | `npm run web` |
| Lint | `npm run lint` |
| Unit tests | `npm run test:unit` |
