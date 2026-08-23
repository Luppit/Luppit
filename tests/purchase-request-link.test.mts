import assert from "node:assert/strict";
import test from "node:test";

import { buildPurchaseRequestUrl } from "../src/utils/purchaseRequestLink.ts";

test("builds a canonical clickable HTTPS purchase-request link", () => {
  assert.equal(
    buildPurchaseRequestUrl("82000000-0000-0000-0000-000000000001"),
    "https://luppit.com/request/82000000-0000-0000-0000-000000000001"
  );
});

test("escapes unexpected path characters", () => {
  assert.equal(
    buildPurchaseRequestUrl("request/id"),
    "https://luppit.com/request/request%2Fid"
  );
});
