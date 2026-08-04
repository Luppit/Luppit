import assert from "node:assert/strict";
import test from "node:test";
import {
    mapAccountDeletionRequestStatus,
} from "../src/services/account.deletion.response.ts";

const response = {
    requestId: "82000000-0000-0000-0000-000000000001",
    requestType: "ACCOUNT",
    status: "queued",
    requestedAt: "2026-08-04T12:00:00.000Z",
    dueAt: "2026-08-11T12:00:00.000Z",
    completedAt: null,
} as const;

test("maps the token-free deletion receipt", () => {
    assert.deepEqual(mapAccountDeletionRequestStatus(response), response);
});

test("accepts a legacy extra status URL without exposing it", () => {
    const mapped = mapAccountDeletionRequestStatus({
        ...response,
        statusUrl: "https://luppit.com/delete-account/status#token=legacy",
    });

    assert.deepEqual(mapped, response);
    assert.equal(mapped !== null && "statusUrl" in mapped, false);
});

test("rejects an incomplete deletion receipt", () => {
    assert.equal(
        mapAccountDeletionRequestStatus({
            requestId: response.requestId,
            requestType: response.requestType,
            status: response.status,
        }),
        null
    );
});
