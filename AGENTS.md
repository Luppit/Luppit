# AGENTS.md

## Purpose
This is the entrypoint for agent guidance in this repository.
Keep this file short and use scoped `AGENTS.md` files for domain-specific rules.

## Global Principles
- Prefer the smallest change that fully solves the task.
- Preserve the existing architecture and naming patterns.
- Reuse current services, RPCs, and tables before adding new abstractions.
- Keep UI behavior DB-driven when DB configuration exists.
- Never hardcode conversation action behavior when DB metadata exists.
- Never hardcode navbar items/routes/labels/icons when DB metadata exists.

## Scoped Guidance Map
- Conversation UI behavior: `app/(conversation)/AGENTS.md`
- Navbar UI behavior: `src/components/navbar/AGENTS.md`
- RPC/runtime contracts and execution behavior: `src/services/AGENTS.md`
- Data model and SQL transition/procedure constraints: `src/db/AGENTS.md`

## Testing & Verification
- Run lint on changed files.
- Run relevant TS checks/tests when possible.
- Never claim checks passed unless they were executed.
- If global checks fail due unrelated pre-existing issues, state that explicitly.

## Security
- Never log secrets/tokens/keys.
- Do not expose internal credentials in code, logs, or SQL snippets.
