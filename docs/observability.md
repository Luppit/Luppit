# Sentry observability

The mobile application reports only fatal native crashes, unhandled JavaScript
errors, and React render failures to the `react-native` project in the `luppit`
Sentry organization. The root application component is wrapped in Sentry's
error boundary so render failures are reported as unhandled.

## Runtime configuration

- Local development uses `EXPO_PUBLIC_SENTRY_ENABLED=false`.
- EAS `preview` and `preview-simulator` use
  `EXPO_PUBLIC_SENTRY_ENABLED=true` and
  `EXPO_PUBLIC_SENTRY_ENVIRONMENT=preview`.
- Preview builds auto-increment their remote iOS build number or Android
  version code so Sentry source maps remain unique to each binary.
- `SENTRY_AUTH_TOKEN` is an EAS secret used only to upload source maps. It must
  never be committed or exposed through an `EXPO_PUBLIC_` variable.
- The mobile DSN is a public client identifier. It does not grant access to the
  Sentry account.

Tracing, profiling, replay, screenshots, view hierarchy, breadcrumbs, request
data, user identity, and arbitrary extra context are disabled. Handled API,
authentication, validation, and expected network failures are not captured by
the client. Server-side data scrubbing and **Prevent Storing of IP Addresses**
must remain enabled in the Sentry project. Advanced data-scrubbing rules remove
the native SDK's installation and device identifiers. Automatic Sentry session
tracking stays disabled, and the native user scope is explicitly cleared.

## Alert workflow

`Mobile preview — new or regressed unhandled crash` is restricted to the
`preview` environment and emails the Sentry owner. Mailbox forwarding is
responsible for delivering the notification to the wider operations group.

## Verification

Use temporary local-only crash triggers in an internal preview build to verify
an unhandled JavaScript error, a React render failure, and a native crash on
Android and iOS. Remove the triggers before the final source diff. Confirm that
the resulting stack frames are source-mapped and that raw events contain no
user, request, or extra data.
