import assert from "node:assert/strict";
import test from "node:test";

import { getBusinessVerificationRefreshMessage } from "../src/services/business-verification.helpers.ts";
import type { BusinessVerification } from "../src/services/business-verification.service.ts";

const pending: BusinessVerification = {
  applicationId: "application-1",
  status: "PENDING",
  rnpNumber: "RNP-1",
  safeMessage: null,
  submissionVersion: 1,
  evidence: [],
};

test("an unchanged authoritative response gives explicit feedback", () => {
  assert.equal(
    getBusinessVerificationRefreshMessage(pending, { ...pending }),
    "No hay cambios en tu solicitud",
  );
});

test("a first successful read does not claim that nothing changed", () => {
  assert.equal(
    getBusinessVerificationRefreshMessage(null, pending),
    "Consultamos el estado de tu solicitud",
  );
});

test("review decisions distinguish approval from other status changes", () => {
  assert.equal(
    getBusinessVerificationRefreshMessage(pending, { ...pending, status: "APPROVED" }),
    "Tu negocio fue aprobado",
  );
  for (const status of ["NEEDS_ACTION", "REJECTED"] as const) {
    assert.equal(
      getBusinessVerificationRefreshMessage(pending, { ...pending, status }),
      "Actualizamos el estado de tu solicitud",
    );
  }
});

test("changed instructions or submission data are not reported as unchanged", () => {
  for (const change of [
    { safeMessage: "Adjuntá la información solicitada." },
    { submissionVersion: 2 },
    { rnpNumber: "RNP-2" },
    { applicationId: "application-2" },
  ]) {
    assert.equal(
      getBusinessVerificationRefreshMessage(pending, { ...pending, ...change }),
      "Actualizamos la información de tu solicitud",
    );
  }
});
