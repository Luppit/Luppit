# Business Verification Review Skill Blueprint

Use this document as the specification for recreating a skill that generates validated SQL for manual business-verification decisions. Create the files below as a skill named `review-business-verification`.

The skill generates SQL only. It must never execute a decision, expose credentials, or bypass the review service RPC. The SQL and validation rules below are specific to the Luppit business-verification workflow; adapt the RPC contract only if the target system uses a different reviewed and version-checked service.

## Resulting structure

```text
review-business-verification/
|-- SKILL.md
|-- agents/
|   `-- openai.yaml
`-- scripts/
    `-- generate_review_sql.py
```

## `SKILL.md`

```markdown
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

Do not infer the application version, canonical identity, reviewer, message, or reason. Do not include document links, registration numbers, personal IDs, or private reviewer notes in a user-facing message.

## Generate the query

Run `scripts/generate_review_sql.py` interactively and pass the collected values exactly when prompted. The script validates UUIDs, versions, decisions, legal IDs, and reason codes and escapes SQL string literals.

Return the script's SQL in one `sql` code block. Add only a short reminder to re-check the application ID and current version before running it in the Supabase SQL Editor.

If the user does not know the current version, direct them to the project's manual business-verification review queue documentation; do not guess.

## Safety rules

- Never run the generated query unless the user separately and explicitly asks to execute that specific decision.
- Never accept arbitrary SQL fragments as field values.
- Never replace the service RPC with direct table updates.
- Never weaken or omit the optimistic `p_expected_version` check.
- Keep canonical legal name and ID exclusive to approval decisions.
```

## `scripts/generate_review_sql.py`

```python
#!/usr/bin/env python3

from __future__ import annotations

import argparse
import re
import sys
import uuid


DECISIONS = {"APPROVE", "REQUEST_MORE", "REJECT"}


def required(value: str | None, label: str) -> str:
    normalized = (value or "").strip()
    if not normalized:
        raise ValueError(f"{label} is required")
    return normalized


def application_id(value: str | None) -> str:
    normalized = required(value, "application ID")
    try:
        return str(uuid.UUID(normalized))
    except ValueError as error:
        raise ValueError("application ID must be a UUID") from error


def submission_version(value: str | int | None) -> int:
    try:
        normalized = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError) as error:
        raise ValueError("submission version must be a positive integer") from error
    if normalized < 1:
        raise ValueError("submission version must be a positive integer")
    return normalized


def decision(value: str | None) -> str:
    normalized = required(value, "decision").upper().replace("-", "_")
    if normalized not in DECISIONS:
        raise ValueError("decision must be APPROVE, REQUEST_MORE, or REJECT")
    return normalized


def legal_id(value: str | None) -> str:
    normalized = required(value, "canonical legal ID")
    if not re.fullmatch(r"[0-9]{10}", normalized):
        raise ValueError("canonical legal ID must contain exactly 10 digits")
    return normalized


def reason_code(value: str | None) -> str:
    normalized = required(value, "internal reason code").lower()
    if not re.fullmatch(r"[a-z0-9]+(?:_[a-z0-9]+)*", normalized):
        raise ValueError("internal reason code must use lowercase snake_case")
    return normalized


def sql_literal(value: str) -> str:
    if "\x00" in value:
        raise ValueError("values cannot contain null bytes")
    return "'" + value.replace("'", "''") + "'"


def build_sql(values: argparse.Namespace) -> str:
    app_id = application_id(values.application_id)
    version = submission_version(values.submission_version)
    selected_decision = decision(values.decision)
    reviewer = required(values.reviewer_reference, "reviewer reference")

    arguments = [
        f"  p_application_id := {sql_literal(app_id)}::uuid",
        f"  p_expected_version := {version}",
        f"  p_decision := {sql_literal(selected_decision)}",
        f"  p_reviewer_reference := {sql_literal(reviewer)}",
    ]

    if selected_decision == "APPROVE":
        arguments.extend([
            f"  p_canonical_legal_name := {sql_literal(required(values.legal_name, 'canonical legal name'))}",
            f"  p_canonical_legal_id := {sql_literal(legal_id(values.legal_id))}",
        ])
    else:
        arguments.extend([
            f"  p_safe_message := {sql_literal(required(values.safe_message, 'safe user-facing message'))}",
            f"  p_internal_reason_code := {sql_literal(reason_code(values.reason_code))}",
        ])

    return "select public.service_review_business_verification(\n" + ",\n".join(arguments) + "\n);"


def interactive_values() -> argparse.Namespace:
    values = argparse.Namespace(
        application_id=input("Application ID: "),
        submission_version=input("Submission version: "),
        decision=input("Decision (APPROVE, REQUEST_MORE, REJECT): "),
        reviewer_reference=input("Reviewer reference: "),
        legal_name=None,
        legal_id=None,
        safe_message=None,
        reason_code=None,
    )
    selected_decision = decision(values.decision)
    if selected_decision == "APPROVE":
        values.legal_name = input("Canonical legal name: ")
        values.legal_id = input("Canonical 10-digit legal ID: ")
    else:
        values.safe_message = input("Safe user-facing message: ")
        values.reason_code = input("Internal snake_case reason code: ")
    return values


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate SQL for a Luppit business-verification review decision."
    )
    parser.add_argument("--application-id")
    parser.add_argument("--submission-version")
    parser.add_argument("--decision")
    parser.add_argument("--reviewer-reference")
    parser.add_argument("--legal-name")
    parser.add_argument("--legal-id")
    parser.add_argument("--safe-message")
    parser.add_argument("--reason-code")
    return parser.parse_args()


def main() -> int:
    try:
        values = interactive_values() if len(sys.argv) == 1 else parse_args()
        print(build_sql(values))
        return 0
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
```

## `agents/openai.yaml`

```yaml
interface:
  display_name: "Review Business Verification"
  short_description: "Generate safe SQL for business review decisions"
  default_prompt: "Use $review-business-verification to generate the SQL for a pending business application decision."
```

## Required validation

After creating the skill:

1. Run the platform's skill validator, if available, against the new skill folder.
2. Run the Python generator interactively for each decision type.
3. Confirm it rejects malformed UUIDs, non-positive versions, legal IDs that are not exactly 10 digits, unsupported decisions, and invalid reason codes.
4. Confirm apostrophes in names and messages are escaped as doubled SQL quotes.
5. Confirm every generated query calls `public.service_review_business_verification` and includes `p_expected_version`.
6. Do not connect the tests to a live database and do not execute the generated SQL.

## Portability notes

- Python 3.10 or newer is required because the script uses `str | None` type syntax.
- The skill assumes the target AI can execute a local Python helper and load a Markdown-based skill entrypoint.
- If the target system is not Luppit, review the decision values, legal-ID format, RPC name, and RPC parameter contract before using it.
