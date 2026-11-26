---
name: run-allocation
description: Run the ParkPermit allocation engine read-only on a CSV pair (no database) to inspect per-lot, per-shift occupancy, accessibility status, KPIs and the decision list, explain one applicant's outcome, or diff placements before and after an engine change. Use when checking engine output, debugging a placement, or asked "why was APP-xxxx placed there?".
---

# Run allocation (read-only)

The engine CLI (`server/src/engine/cli.js`) ingests two CSVs, runs `allocate()` and prints the
result. It never touches MongoDB or writes data files, except an optional JSON output you ask for.

Run it from the **repo root** (paths are relative to the current directory):

```bash
node server/src/engine/cli.js                                   # UAT fixture (default)
node server/src/engine/cli.js --apps data/samples/term-seed42/applications.csv \
                              --lots data/samples/term-seed42/lots.csv
node server/src/engine/cli.js --explain APP-0030                # one applicant, full placement JSON
node server/src/engine/cli.js --json /tmp/before.json           # save the full result
node server/src/engine/cli.js --diff /tmp/before.json           # placements that changed
```

Write `--json` output to the session scratchpad, not to `data/`. The real-data guard rejects unknown files there.

## Reading the output

- **Table**: per lot and vehicle pool: general capacity, load per window (early / afternoon /
  night), peak %, accessible bays used/total, permits, and flags (`OVER` > 100%, `RISK` ≥ 90%,
  `shared` = bays shared across non-overlapping shifts).
- **KPIs**: placed, suggested, unplaced, excluded; share placed in a chosen lot (1st, 2nd, 3rd).
- **Accessibility**: holders in accessible bays / all holders, and pending. It must say `OK`
  or list a `NEEDS_DECISION` for every holder who is not placed.
- **Decision list**: everyone with `NEEDS_DECISION` or `NO_LONGER_ON_CAMPUS`, with the shareable reason.

## Explaining a placement

Run `--explain <id>`, then explain using **only** that applicant's fields: status, lot, bay type,
choice rank, flags, `reason`, and the `unmet` reasons for earlier choices. Do not mention other
applicants by id or name. Do not mention the accessibility flag unless the bay type is accessible.
The order of play is in `docs/ARCHITECTURE.md` §5.2 (accessibility pass → choice-rank rounds,
sorted by type, then distance, then id → nearest-lot suggestion → unplaced).

## Checking an engine change

1. On `main`: `node server/src/engine/cli.js --json <scratch>/before.json`.
2. On the branch: `node server/src/engine/cli.js --diff <scratch>/before.json`.
3. Every changed placement must be explained by the intended change. Report the diff in the PR
   under "Engine output changed?", then run the `check-uat` skill.

If ingest reports blocking validation errors, the CLI exits 1 and lists them with row numbers.
Fix the generator (see `generate-synthetic-data`), not the CSV.
