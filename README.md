# Luppit

## Run or build the app

Use one command for the normal Expo workflow:

```bash
npm run app
```

The launcher explains and runs one of these modes:

- **Development server — Tunnel**: the reliable daily workflow when the phone cannot reach the Mac over Wi-Fi. Development traffic is routed through Expo/ngrok, but React Native DevTools cannot currently attach through this tunnel.
- **Development server — LAN + debugger**: the faster daily workflow when the Mac and phone can reach each other on the same local network. Use this mode when you need React Native DevTools.
- **Reinstall existing development build**: opens the EAS build history. Select the latest successful Development build, click **Install**, and scan its QR code; this does not create another build.
- **Development build**: creates a new installable development client with EAS. Use it after changing `app.json`, adding/updating a native dependency, or upgrading Expo.
- **Preview build**: creates a standalone internal build for realistic testing or sharing. It does not need Metro.
- **Production build**: creates the store/TestFlight build.

Development and preview builds skip Sentry artifact uploads. Production tries the upload when configured, but Sentry cannot fail the app build.

Direct non-interactive forms are also available:

```bash
npm run app -- dev
npm run app -- dev-tunnel
npm run app -- reinstall
npm run app -- development ios
npm run app -- preview ios
npm run app -- preview ios-simulator
npm run app -- production all
```

The current profile is shown in the app under **Configuración → Versión**.
