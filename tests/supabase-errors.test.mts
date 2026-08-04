import assert from "node:assert/strict";
import test from "node:test";
import { fromSupabaseError } from "../src/lib/supabase/errors.ts";

test("localizes the missing OTP account response", () => {
  const byCode = fromSupabaseError({
    code: "signup_disabled",
    message: "Signups not allowed for OTP",
  });
  const byLegacyMessage = fromSupabaseError({
    message: "Signups not allowed for OTP",
  });

  assert.equal(byCode.message, "No encontramos una cuenta activa con ese número.");
  assert.equal(byLegacyMessage.message, byCode.message);
});

test("localizes common OTP errors by their stable codes", () => {
  assert.equal(
    fromSupabaseError({ code: "otp_expired", message: "Token has expired" }).message,
    "El código es inválido o venció. Solicita uno nuevo e inténtalo de nuevo.",
  );
  assert.equal(
    fromSupabaseError({
      code: "over_sms_send_rate_limit",
      message: "SMS rate limit exceeded",
    }).message,
    "Solicitaste demasiados códigos. Espera un momento antes de intentarlo de nuevo.",
  );
});

test("does not expose an unknown provider message", () => {
  const error = fromSupabaseError({ message: "Unexpected provider failure" });

  assert.equal(error.message, "Ocurrió un error, intenta de nuevo.");
  assert.equal(error.message.includes("provider"), false);
});
