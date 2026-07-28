# AGENTS.md

## Purpose
Entrypoint for repository guidance. Keep this file compact; put only durable, high-risk rules here and use scoped `AGENTS.md` files for local behavior.

## Core Principles
- Prefer the smallest change that fully solves the task.
- Preserve existing architecture, naming, shared UI behavior, and service/RPC boundaries.
- Reuse current services, RPCs, tables, and shared components before adding new abstractions.
- Ask before changing public APIs, schemas, navigation structure, or established app architecture.
- Do not add dependencies unless they clearly reduce complexity.
- Never log or expose secrets, tokens, API keys, OTPs, Supabase sessions, or refresh tokens.

## Source Of Truth Rules
- Keep product behavior DB-driven whenever DB metadata/RPCs exist; do not recreate parallel client-only state.
- Buyer/seller home discovery, grouping, filters, status labels/styles, segment selection, favorites, visualization counts, and lifecycle visibility belong to their DB RPCs/configuration.
- Conversation actions, menu items, confirmations, passive status/deadline cards, rating visibility, deadlines, transitions, and message open-state belong to DB metadata/RPCs.
- Navigation/menu/segment labels and icons come from DB configuration; do not hardcode buyer/seller menus or segment arrays.
- Profile/account data stays profile-driven: one auth user may own multiple profiles, the active profile is resolved through the root provider, phone is read-only login identity, email changes use OTP verification, and ratings come from summary tables/views.
- Non-sensitive runtime application variables belong in `app_config`; screens and components must read them through services rather than build-time constants. Never store secrets in client-readable configuration.

## Supabase Repository Boundary
- The Supabase database repository is a separate sibling repository at `../luppit-supabase`; never create, clone, or nest it inside this application repository.
- The Edge Functions source repository is `Luppit/ai-edge-functions`; Edge Function source, function tests, and deployment configuration belong there, not in this app or `../luppit-supabase`.
- Do not create or restore a root `supabase/` directory here. Migrations, seeds, database tests/scripts, CLI configuration, and schema automation belong only in `../luppit-supabase`.
- This application repository may keep the generated `src/types/database.types.ts`, Supabase client/runtime integration under `src/lib/supabase/`, and required client dependencies.

## Shared Glass UI
- Render glass through `src/components/glass/GlassSurface.tsx` and tune material roles in `src/themes/glass.ts`; avoid one-off blur/rgba/shadow recipes.
- Use glass roles intentionally: `surface`, `chrome`, `nav`, `sheet`, `control`, `headerControl`, and `chip`.
- Header chrome attaches to the top/sides including safe area with only bottom corners rounded; bottom nav uses the shared `nav` material.
- Controls inside glass should be plainer than their parent material; preserve shared shadows/clipping through `GlassSurface`.

## Soft List UI
- Settings/profile/help-style option lists should follow `src/components/AGENTS.md` and reuse `GroupedListSection`, `GroupedListRow`, and shared rounded surface helpers.
- Keep compact rows calm and scannable, but give wrapped text and descriptions enough vertical room.

## Scoped Guidance
- Buyer request assistant: `app/(chat)/AGENTS.md`
- Conversations: `app/(conversation)/AGENTS.md`
- Detail/account screens: `app/(detail)/AGENTS.md`
- Home/profile tabs: `app/(tabs)/AGENTS.md`
- Shared components/style standards: `src/components/AGENTS.md`
- Shared composer: `src/components/inputChat/AGENTS.md`
- Navbar: `src/components/navbar/AGENTS.md`
- Shared popup: `src/components/popup/AGENTS.md`
- Services/RPC integration: `src/services/AGENTS.md`
- DB/SQL contracts: `src/db/AGENTS.md`

## Verification
- Run lint on changed files and relevant TS checks/tests when possible.
- Never claim checks passed unless they actually ran.
- If a global check fails for unrelated pre-existing reasons, say so explicitly.
