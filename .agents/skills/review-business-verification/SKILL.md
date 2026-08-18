---
name: review-business-verification
description: Generate validated, version-checked SQL for Luppit manual business-verification decisions. Use when a reviewer wants to approve, reject, or request more information for a pending business verification application and needs the exact Supabase SQL Editor query.
---

# Review Business Verification

Generate SQL only. Never execute the review decision, expose a service-role key, or invent missing values.

## Collect the decision

Ask for all common fields in one concise message:

- Application ID.
- Current `submission_version` from the review queue.
- Decision: `APPROVE`, `REQUEST_MORE`, or `REJECT`.
- Reviewer reference, normally the teammate's email.

Then request the decision-specific fields:

- `APPROVE`: canonical legal name and normalized 10-digit legal ID obtained during review.
- `REQUEST_MORE`: safe user-facing message and an internal snake-case reason code.
- `REJECT`: safe user-facing message and an internal snake-case reason code.

Do not infer the application version, canonical identity, reviewer, message, or reason. Do not include document links, RNP numbers, personal IDs, or private reviewer notes in a user-facing message.

## Generate the query

Run `scripts/generate_review_sql.py` interactively and pass the collected values exactly when prompted. The script validates UUIDs, versions, decisions, legal IDs, and reason codes and escapes SQL string literals.

Return the script's SQL in one `sql` code block. Add only a short reminder to re-check the application ID and current version before running it in the Supabase SQL Editor.

If the user does not know the current version, direct them to the review queue in `docs/manual-business-verification.md`; do not guess.

## Safety rules

- Never run the generated query unless the user separately and explicitly asks to execute that specific decision.
- Never accept arbitrary SQL fragments as field values.
- Never replace the service RPC with direct table updates.
- Never weaken or omit the optimistic `p_expected_version` check.
- Keep canonical legal name and ID exclusive to approval decisions.
