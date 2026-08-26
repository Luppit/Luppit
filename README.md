# Luppit

## Run or build the app

Use one command for the normal Expo workflow:

```bash
npm run app
```

The launcher explains and runs one of these modes:

- **Development server — iPhone LAN + debugger**: the daily iPhone workflow. The Mac and phone must be on the same local network, and this mode supports React Native DevTools.
- **iOS Simulator**: builds and installs the local Debug app using Xcode's incremental cache, starts Metro, and opens Luppit in the simulator. Use this for Codex and style work; it does not consume an EAS build.
- **Reinstall existing development build**: opens the EAS build history. Select the latest successful Development build, click **Install**, and scan its QR code; this does not create another build.
- **Development build**: creates a new installable development client with EAS. Use it after changing `app.json`, adding/updating a native dependency, or upgrading Expo.
- **Preview build**: creates a standalone internal build for realistic testing or sharing. It does not need Metro.
- **Production build**: creates a signed store build without submitting it.
- **Build and submit for store testing**: creates a production `.ipa` for TestFlight or `.aab` for Google Play internal testing, then submits it automatically.

Development and preview builds skip Sentry artifact uploads. Production tries the upload when configured, but Sentry cannot fail the app build.

Direct non-interactive forms are also available:

```bash
npm run app -- dev
npm run app -- simulator
npm run app -- reinstall
npm run app -- development ios
npm run app -- preview ios
npm run app -- preview ios-simulator
npm run app -- production all
npm run app -- release ios
npm run app -- release android
npm run app -- release all
```

The Android submission requires a Google Play app and a Google Service Account key uploaded to the project's EAS credentials. The iOS submission prompts for any missing App Store Connect credentials. Neither path submits the app for a public production release.

The current profile is shown in the app under **Configuración → Versión**.
