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
data, user identity, device context, tags, and arbitrary extra context are
disabled or removed before transmission. Handled API, authentication,
validation, and expected network failures are not captured by the client.
Automatic Sentry session tracking stays disabled, and the native user scope is
explicitly cleared.

Code-side filtering does not control IP addresses inferred by Sentry at
ingestion. Before a production build is submitted, both **Server-side data
scrubbing** and **Prevent Storing of IP Addresses** must be verified in the
`luppit/react-native` project. Advanced data-scrubbing rules must remove native
installation and device identifiers as defense in depth. Do not describe these
dashboard controls as enabled until the production project has been inspected.

## Alert workflow

`Mobile preview — new or regressed unhandled crash` is restricted to the
`preview` environment and emails the Sentry owner. Mailbox forwarding is
responsible for delivering the notification to the wider operations group.

## Verification

Use temporary local-only crash triggers in an internal preview build to verify
an unhandled JavaScript error, a React render failure, and a native crash on
Android and iOS. Remove the triggers before the final source diff. Confirm that
the resulting stack frames are source-mapped and that raw events contain no
user, request, extra, device identifier, installation identifier, or IP data.
Record the verification date and the reviewer in the legal council package.
