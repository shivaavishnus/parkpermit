---
name: review-code
description: Review ParkPermit changes (a diff, branch or PR) against the project's non-negotiable rules — accessible-bay safety, no personal characteristics in placement, synthetic-only data, a pure deterministic engine, admin final control, shareable reasons — plus API, test and WCAG conventions. Use before opening or merging a PR, or when asked to "review", "check my changes" or "is this ready to merge".
---

# Review code (ParkPermit)

A project-specific review. It focuses on the rules in `CLAUDE.md` that generic reviews miss. Report
findings; do not rewrite the change unless the user asks.

## 1. Collect the change

```bash
git fetch origin main -q
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
```

For a PR, use `gh pr diff <n>` and `gh pr view <n>`. Read every changed file in full, not just the
hunks, when it is in `server/src/engine/`, `server/src/ingest/`, `data/` or a route that moves
applicants.

## 2. Run the automatic checks

```bash
npm run lint
npm run test:engine -w server -- --coverage
npm run uat
npm run check:data
git diff origin/main...HEAD -- data/fixtures/uat/expected.json   # must be empty unless the user approved it
```

Quick greps over the diff. Each hit needs a justification:

```bash
git diff origin/main...HEAD -- server/src/engine | grep -nE "^\+.*(Math\.random|Date\.now|new Date|mongoose|express|from 'node:fs'|\.name\b)"
git diff origin/main...HEAD | grep -nE "^\+.*(accessibility|accessible)"   # every touch of the flag gets a close read
git diff origin/main...HEAD | grep -niE "^\+.*(medical|diagnos|disab|condition)"
```

## 3. Rule checklist (blocking)

| #   | Rule                               | What to look for                                                                                                                                                                                                                                |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Synthetic data only                | New files in `data/` must come from the generator and be listed in `MANIFEST.json`. No realistic personal data in tests, docs or seeds.                                                                                                         |
| R2  | Accessible bays are sacred         | Only holders in accessible bays, one per bay. No shift sharing, no overselling, no reassignment to non-holders, **no override path**, including admin overrides and the "force" flags. `assertInvariants` runs after every allocation and move. |
| R3  | The accessibility flag has one use | Not used in sorting, ranking, KPIs (beyond the accessibility panel), reasons about others, logs or exports (only `bayType`). No medical fields.                                                                                                 |
| R4  | No personal characteristics        | The engine reads only type, home_block, vehicle, shift, prefs, accessibility_permit, active_on_campus and id. It never reads `name`.                                                                                                            |
| R5  | Admin keeps control                | Nothing auto-approves, auto-finalizes or auto-resolves a decision.                                                                                                                                                                              |
| R6  | Reasons                            | Every outcome and every unmet choice has a one-sentence reason that mentions only that applicant's own situation (no other ids, names or counts that identify people).                                                                          |
| R7  | Pure, deterministic engine         | No I/O, DB, express, clock or randomness in `server/src/engine/`. Every sort ends with `appId` (or `lotId`) as the final tie-break.                                                                                                             |
| R8  | Capacity math                      | General capacity = total − accessible − visitor − reserved from `lots.csv`. Fit check: `load + 1 ≤ generalCap` for **every** window the shift covers. `varies` = all windows. `past_peak_count` is never used in the math.                      |
| R9  | Config                             | Capacities, shift windows, type ranks and the risk threshold come from `server/src/config/allocation.js` or CSV, never literals.                                                                                                                |
| R10 | `expected.json`                    | Unchanged, or the change was approved by the user.                                                                                                                                                                                              |

## 4. Convention checklist

- **API:** thin routes validated with zod; logic in services; persistence in models. Errors use
  `{ error: { code, message, details } }` with codes `VALIDATION | UNAUTHORIZED | CONFLICT_VERSION | RULE_BLOCKED | NOT_FOUND`.
  Moves use `expectedVersion` and write an `AuditEvent`. Every route except login requires auth.
- **Security:** no secrets in code; inputs validated; CSV size limit; httpOnly cookie; no stack traces in responses.
- **Tests:** new behaviour has tests. Engine coverage ≥ 90%. Tests are named after rules (see the `write-tests` skill).
- **UI:** WCAG 2.1 AA; occupancy never shown by colour alone; keyboard reachable; labelled controls (see the `ui-ux` skill).
- **Style:** ES modules, JSDoc on exported functions, Prettier, no dead code, no console logging in server code outside the CLI.
- **Process:** branch `feat/E<n>-S<n>-<slug>`, Conventional Commit title with the story ID, docs updated if behaviour, API or the data model changed.

## 5. Correctness hunt

Beyond the checklists, look for real bugs:

- Off-by-one at capacity (13th vs 14th car; `≥ 90%` vs `> 90%`).
- Night shift wrap-around (21:00–05:00) treated as one window, never split.
- Moves that update the target but not the source occupancy, or that skip re-running invariants.
- Undo and restore that bypass rule checks.
- Mutation of input arrays inside the engine, which breaks determinism and React state.
- Approval not reopened when an applicant in an approved lot is moved.

## 6. Report

Group findings by severity. Give each one `file:line`, the rule (R1–R10 or a convention), a concrete failure
scenario, and a suggested fix:

- **Blocking**: any R1–R10 breach, failing checks, or a correctness bug.
- **Should fix**: a convention breach or a missing test.
- **Nit**: style.

End with the check results (lint, tests and coverage, UAT, data guard) and a verdict: _ready to
merge_, or _changes needed_ with a list of the blockers. If there are no findings, say so plainly.
