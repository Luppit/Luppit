export type AccountDeletionRequestStatus = {
    requestId: string;
    requestType: "ACCOUNT" | "PROFILE";
    status: "queued" | "processing" | "completed" | "failed" | "canceled";
    requestedAt: string;
    dueAt: string;
    completedAt: string | null;
};

export function mapAccountDeletionRequestStatus(
    value: unknown
): AccountDeletionRequestStatus | null {
    if (!value || typeof value !== "object") return null;

    const record = value as {
        requestId?: unknown;
        request_id?: unknown;
        requestType?: unknown;
        request_type?: unknown;
        status?: unknown;
        requested_at?: unknown;
        requestedAt?: unknown;
        due_at?: unknown;
        dueAt?: unknown;
        completed_at?: unknown;
        completedAt?: unknown;
    };
    const requestId = record.requestId ?? record.request_id;
    const requestType = record.requestType ?? record.request_type;
    const status = record.status;
    const requestedAt = record.requested_at ?? record.requestedAt;
    const dueAt = record.due_at ?? record.dueAt;
    const completedAt = record.completed_at ?? record.completedAt;

    if (
        status !== "queued" &&
        status !== "processing" &&
        status !== "completed" &&
        status !== "failed" &&
        status !== "canceled"
    ) {
        return null;
    }

    if (
        typeof requestId !== "string" ||
        (requestType !== "ACCOUNT" && requestType !== "PROFILE") ||
        typeof requestedAt !== "string" ||
        typeof dueAt !== "string" ||
        !requestId ||
        !requestedAt ||
        !dueAt
    ) {
        return null;
    }

    return {
        requestId,
        requestType,
        status,
        requestedAt,
        dueAt,
        completedAt: typeof completedAt === "string" && completedAt.length > 0
            ? completedAt
            : null,
    };
}
