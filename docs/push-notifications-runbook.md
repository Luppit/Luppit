# Push notifications rollout

The implementation uses Expo Push Service for iOS and Android. Database mode is
`test` after migration, so no production user receives a push unless their Auth
user is explicitly allowlisted.

## Implemented events

- Human text and image messages.
- Offer created, updated, accepted, rejected, or withdrawn.
- Seller confirmation, shipment, pickup completion, receipt confirmation,
  non-receipt, purchase/request cancellation, expired critical deadlines, and
  participant deletion.
- Identity and business-verification approval, action-required, and rejection
  outcomes.

Seller request opens/discards, system sibling closures, ratings, favorites,
views, and scheduled reminders are intentionally excluded. Lock-screen text is
generic and never contains names, products, request titles, message text,
documents, or reviewer notes.

## External credentials

### Android

1. Create or select the Firebase project for `com.luppit.app`.
2. Register the Android app and download `google-services.json`.
3. Place it at the application repository root and add
   `"googleServicesFile": "./google-services.json"` under `expo.android` in
   `app.json`.
4. Upload the Firebase Cloud Messaging V1 service-account key to EAS with
   `eas credentials --platform android`.

Do not add the `googleServicesFile` setting before the file exists: native
prebuilds will fail with a dangling path.

### iOS

After the Apple Developer Program membership becomes active, run
`eas credentials --platform ios` and let EAS create or reuse the APNs push key
for `com.luppit.app`. Use a development or preview build. Current iOS simulators
can support push with a compatible simulator build, but release sign-off should
still include a physical iPhone.

### Expo and Edge Functions

Deploy `process-push-notifications` with the rest of the tracked Edge Function
inventory. It uses the existing named `automations` secret. If Expo push
access-token security is enabled for the EAS project, also configure the Edge
secret `EXPO_ACCESS_TOKEN`.

Store the deployed worker URL in Database Vault under `push_worker_url`. The
scheduled invocation reuses the existing `account_deletion_automation_key`
Vault value. A missing URL or automation key is a safe no-op.

## Test-only rollout

After applying the database migration, allowlist only the Auth users assigned
to physical test devices:

```sql
insert into private.push_test_user (user_id)
values ('<auth-user-uuid>')
on conflict (user_id) do nothing;
```

Confirm the mode before every hosted test:

```sql
select mode from private.push_runtime_config where singleton;
```

Expected value: `test`.

Build both physical-device clients after credentials are configured:

```sh
eas build --profile development --platform android
eas build --profile development --platform ios
```

Test permission granted/denied, signed-out behavior, foreground conversation
suppression, background and terminated taps, profile switching, every critical
event family, retry recovery, and `DeviceNotRegistered` cleanup.

## Production enablement

Enable the full audience only after both physical-device matrices pass and the
worker/Vault runtime verification is green:

```sql
update private.push_runtime_config
set mode = 'all', updated_at = now()
where singleton;
```

Emergency shutoff:

```sql
update private.push_runtime_config
set mode = 'disabled', updated_at = now()
where singleton;
```

Changing mode affects newly generated events; it never bypasses OS permission
or re-enables invalidated devices.
