# ParkPermit — Skills

## 1. Team skills per epic
| Epic | Primary skills | Supporting |
|---|---|---|
| E1 Auth & shell | Express middleware, JWT/cookie sessions, bcrypt, React Router | Security review |
| E2 Ingest | CSV parsing (papaparse), zod schemas, data-quality rules | Domain knowledge of the known data issues |
| E3 Engine | Algorithm design (greedy and priority allocation), pure functional JS, unit testing, property tests | Parking ops domain (shifts, accessibility policy) |
| E4 Review UI | React, data-heavy tables, accessible charts (per-shift bars), WCAG 2.1 AA | UX writing for reasons and labels |
| E5 Decisions | React forms, REST design | Product: decision taxonomy |
| E6 Move | Optimistic concurrency, debounced preview calls, dialog UX | Engine (`checks.js`) |
| E7 Approve/export | State machines, CSV export, audit logging | Compliance review |
| E8 Synthetic data/UAT | Seeded data generation, test fixtures, QA scripting | Product owner for UAT sign-off |
| E9 CI/CD | GitHub Actions, Docker, hosting provider, MongoDB Atlas | Secrets management |

Roles for the sprint: **Product owner** (parking admin proxy, signs off UAT), **Tech lead** (engine and architecture), **Full-stack dev ×2** (API and UI), **QA** (part-time; UAT scripts, can be the tech lead).

## 2. Claude Code skills (`.claude/skills/`)
These are created in Step 2. Each is a folder with a `SKILL.md` (YAML frontmatter `name`, `description`, then instructions).

### `generate-synthetic-data`
- **When:** a new or changed synthetic dataset is needed, or UAT fixtures need updating.
- **Does:** runs `npm run gen:data -- --seed <n> --size <n> --out data/samples/<name>`; regenerates `data/fixtures/uat` from `scenarios.js`; updates `MANIFEST.json`; prints a coverage table showing which UAT case each fixture row exercises, and checks that at least one lot is oversubscribed.
- **Guardrails:** synthetic names only (generated from fixed word lists); never read or copy files outside `data/`; refuse to import a user-supplied "real" CSV.

### `run-allocation`
- **When:** checking engine output after a change, or explaining a placement.
- **Does:** runs the engine CLI (`node server/src/engine/cli.js --apps <csv> --lots <csv> [--explain APP-0007]`) with no DB; prints per-lot, per-shift occupancy, accessibility status, KPIs and the decision list; `--diff <previous.json>` shows which placements changed.
- **Guardrails:** read-only; never writes to MongoDB.

### `check-uat`
- **When:** before opening a PR that touches the engine or ingest, or when asked "are we UAT-ready?".
- **Does:** runs `npm run uat`, maps results to UAT-1..7 in a pass/fail table with evidence (lot, applicant ids, occupancy), checks invariants (accessible ≤ capacity, only holders in accessible bays, no inactive placed, every outcome has a reason), and drafts the UAT section for the PR description.
- **Guardrails:** does not edit `expected.json` to make tests pass. If expectations should change, it stops and asks.

### Optional, later
- `new-story` scaffolds a branch, test stub and PR template from a story ID in PRD.md.
- `explain-placement` produces an admin-friendly explanation of one applicant's outcome for appeals.
