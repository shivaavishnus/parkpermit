# CLAUDE.md — ParkPermit

Two-week MVP for campus parking permit allocation. One user: the parking admin. MERN stack (MongoDB, Express, React + Vite, Node 20), npm workspaces `client` and `server`. Docs: `docs/` (start with PRD.md and ARCHITECTURE.md).

## Non-negotiable rules
1. **Synthetic data only.** Never add, import or generate data from real people. Everything in `data/` comes from `data/generator`.
2. **Accessible bays are sacred.** Only accessibility permit holders go in accessible bays, one per bay. They are never shift-shared, never oversold, never reassigned to non-holders, and no override exists. `checks.assertInvariants` must enforce this after every run and move.
3. **Accessibility flag has one use:** choosing an accessible bay. It is not used in ranking, sorting, reasons about other people, or exports beyond `bayType`. No medical details anywhere.
4. **No personal characteristics in placement.** The engine may read only: type, home_block, vehicle, shift, prefs, accessibility_permit, active_on_campus, id. It never reads `name`.
5. **Admin keeps final control.** The engine proposes; the admin moves, resolves, approves and finalizes. Never auto-finalize or auto-approve.
6. **Every outcome has a one-sentence, shareable reason** that mentions only that applicant's own situation.

## Allocation rules (summary, details in ARCHITECTURE.md §5)
- General capacity = total − accessible − visitor − reserved (from `lots.csv`).
- Shift windows: early 05–13, afternoon 13–21, night 21–05; `varies` = all three (flag `HOURS_VARIES`).
- Fit: for every window the shift covers, `load + 1 ≤ generalCap`. Peak per window must be ≤ 100% unless the admin records an override reason.
- Order: accessibility pass → general pass in choice-rank rounds sorted by (staff > faculty > contractor > student, distance lot→home block, id) → fallback to nearest fitting lot as `suggested` + `NEEDS_DECISION` → else `unplaced`.
- `active_on_campus = no` → `excluded`, flag `NO_LONGER_ON_CAMPUS`. Duplicate prefs are collapsed; if all are the same lot, flag `SAME_LOT_ALL_CHOICES`.
- `past_peak_count` is context only (it includes visitors and contractors). Never use it in capacity math.
- `OVERCROWDING_RISK` at ≥ 90% (config).

## Code conventions
- ES modules, JSDoc types, Prettier defaults, ESLint must pass.
- `server/src/engine/` is **pure**: no I/O, no mongoose, no express, no Date.now, no Math.random. Deterministic: every sort ends with `appId`.
- Business config lives in `server/src/config/allocation.js`. Do not hard-code capacities or shift times.
- Routes are thin, validated with zod; logic goes in services; persistence in models.
- Errors: `{ error: { code, message, details } }` with codes `VALIDATION | UNAUTHORIZED | CONFLICT_VERSION | RULE_BLOCKED | NOT_FOUND`.
- Moves use optimistic concurrency (`expectedVersion`) and always write an `AuditEvent`.
- UI: WCAG 2.1 AA; never convey occupancy by colour alone.

## Testing
- Vitest everywhere. Engine coverage ≥ 90%. Each engine module has its own test file plus determinism and invariant tests.
- `npm run uat` must stay green; it asserts UAT-1..7 against `data/fixtures/uat/expected.json`. Never edit `expected.json` just to make a test pass. Ask first.
- API tests: Supertest + mongodb-memory-server.

## Workflow
- Branches `feat/E<n>-S<n>-<slug>`, Conventional Commits, squash-merge to `main` via PR with green checks (see docs/CICD.md).
- Build epic by epic in PRD order. Engine (E3) has tests before UI depends on it.
- Skills in `.claude/skills/`: `generate-synthetic-data`, `write-tests`, `review-code`, `ui-ux`, `write-user-stories`, `run-allocation`, `check-uat` (see docs/SKILLS.md).

## Commands (once scaffolded)
`npm run dev` · `npm test` · `npm run test:engine -w server` · `npm run uat` · `npm run gen:data` · `npm run lint` · `docker compose up -d mongo`
