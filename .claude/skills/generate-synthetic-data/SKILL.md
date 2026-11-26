---
name: generate-synthetic-data
description: Generate, extend or check ParkPermit's synthetic CSVs (applications.csv, lots.csv) and the UAT-1..7 fixture. Use when a new dataset, a bigger demo sample, a new edge-case row or a fixture change is needed, or when someone asks to load, import or anonymise "real" data (refuse and offer synthetic instead).
---

# Generate synthetic data

ParkPermit uses **synthetic data only** (CLAUDE.md rule 1). Every file in `data/` comes from
`data/generator/` and is recorded with its hash in `data/MANIFEST.json`. CI runs
`npm run check:data` and fails on any file the generator did not write.

## Guardrails (check these first)

- **Never** read, copy, import, "anonymise" or base rows on a real CSV, export, spreadsheet or
  list of people, even if the user supplies it or says it is already anonymised. Say that
  ParkPermit is synthetic-only and offer to generate an equivalent dataset with the same shape.
- Names come only from the fixed word lists in `data/generator/names.js`. Do not add names of
  real or famous people. Do not add fields beyond the schema below, and no medical details.
- Never hand-edit a CSV, `expected.json` or `MANIFEST.json`. Change the generator, then regenerate.
- If regenerating **changes `data/fixtures/uat/expected.json`**, stop and ask the user before
  keeping it (CLAUDE.md: never edit expected.json just to make a test pass).
- The generator must stay deterministic: seeded PRNG (`rng(seed)` in `generate.js`), no `Math.random`, no `Date.now`.

## Schema

`applications.csv`:
`id,name,type,home_block,vehicle,shift,pref_1,pref_2,pref_3,accessibility_permit,active_on_campus`

- `type`: staff | faculty | contractor | student
- `home_block`: A–E; `vehicle`: car | bike
- `shift`: early | afternoon | night | varies (messy casing and spaces such as `Varies ` are
  deliberate, to exercise normalisation)
- `pref_1..3`: `LOT-A`..`LOT-E` (pref_2/3 may be blank)
- `accessibility_permit`, `active_on_campus`: yes | no

`lots.csv` is built by `data/generator/lots.js`: 5 lots, one per block; per vehicle 25 bays with
2 accessible and 5 visitor; car has 5 reserved. General capacity: car 13, bike 18 per window.
It carries distances to each block and an optional `past_peak_count` (context only).

## Files

| File                             | Purpose                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `data/generator/generate.js`     | CLI entry, seeded PRNG, `buildSample`, CSV writer, manifest update |
| `data/generator/scenarios.js`    | Hand-designed UAT fixture groups, each tagged with UAT ids         |
| `data/generator/lots.js`         | Lot definitions                                                    |
| `data/generator/names.js`        | Fictional name parts                                               |
| `scripts/check-data-manifest.js` | Real-data guard (`npm run check:data`)                             |
| `scripts/uat-coverage.js`        | Coverage and oversubscription report                               |

## Workflows

### Regenerate the fixture and default sample

```bash
npm run gen:data                         # writes data/fixtures/uat + data/samples/term-seed42
node scripts/uat-coverage.js             # UAT table + demand vs capacity
npm run check:data                       # manifest matches
git diff --stat data/                    # nothing should change unless the generator changed
```

### Make a new sample (demos, performance)

```bash
npm run gen:data -- --seed 7 --size 500 --out data/samples/term-seed7-500
node scripts/uat-coverage.js --dir data/samples/term-seed7-500
```

Samples have no `expected.json`, so the report shows only the issue counts and demand. Use
`--size 500` for the performance target (allocation < 2 s).

### Add or change a UAT edge case

1. Add a group to `groups` in `scenarios.js` with `tags: ['UAT-n']`. Append new groups after the
   existing ones so existing application ids do not shift, or `expected.json` changes for every case.
2. Run `npm run gen:data`, then `git diff data/fixtures/uat/expected.json`.
3. If `expected.json` changed, show the diff to the user and ask before keeping it.
4. Run `node scripts/uat-coverage.js` and `npm run uat` (see the `check-uat` skill).

## Done when

- `node scripts/uat-coverage.js` exits 0: every UAT-1..7 case has rows, and at least one lot is
  oversubscribed (Lot A cars in the fixture).
- The fixture still includes every known data issue: `varies` hours, same lot for every choice,
  inactive applicants, accessibility holders exceeding a lot's accessible bays, and night shifts
  that can share with early staff.
- `npm run check:data` passes, and generated files plus `MANIFEST.json` are committed together.
- Report the coverage table and any `expected.json` change in the reply or PR.
