import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOtpValue } from "../src/components/otpVerifier/otp.ts";

test("normalizes manually entered OTP digits", () => {
  assert.equal(normalizeOtpValue("123", 6), "123");
  assert.equal(normalizeOtpValue("123456", 6), "123456");
  assert.equal(normalizeOtpValue("1234567", 6), "123456");
  assert.equal(normalizeOtpValue("12 34 56", 6), "123456");
});

test("extracts an OTP from pasted SMS content", () => {
  assert.equal(
    normalizeOtpValue("Tu código de Luppit es 123-456", 6),
    "123456"
  );
  assert.equal(normalizeOtpValue("Sin código", 6), "");
  assert.equal(normalizeOtpValue("123456", 0), "");
});
