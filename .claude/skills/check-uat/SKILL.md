---
name: check-uat
description: Check ParkPermit's UAT-1..7 readiness — run the UAT suite on the synthetic fixture, verify the allocation invariants, and produce a pass/fail table with evidence for the PR description. Use before opening a PR that touches the engine, ingest or data, or when asked "are we UAT-ready?" or "does UAT pass?".
---

# Check UAT

UAT cases come from the brief (`docs/BRIEF.md`). Expected results are in `docs/PRD.md` §8.
Fixture membership is in `data/fixtures/uat/expected.json`, and the assertions are in
`server/test/uat/uat.test.js`.

**Never edit `expected.json` or weaken an assertion to make UAT pass.** If an expectation seems
wrong, stop, explain why, and ask the user.

## Steps

1. Confirm that the fixture is intact and covers every case:
   ```bash
   npm run check:data
   node scripts/uat-coverage.js
   ```
2. Run the suite:
   ```bash
   npm run uat
   ```
   If `server/test/uat/uat.test.js` does not exist yet, say so and offer to write it with the
   `write-tests` skill. Do not report UAT as passing.
3. Gather the evidence from the engine (see the `run-allocation` skill):
   ```bash
   node server/src/engine/cli.js
   node server/src/engine/cli.js --explain <id>   # one representative id per case
   ```
4. Verify the invariants on the result, whether or not tests cover them:
   - accessible bays used ≤ accessible bays in every pool, and only holders are in them;
   - no general window is over 100% unless an override is recorded;
   - no inactive applicant is placed;
   - every placement and unmet choice has a one-sentence reason about that applicant only;
   - the accessibility summary says `OK`, or every pending holder has `NEEDS_DECISION`.

## What each case must show (fixture)

| UAT                             | Pass when                                                                                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Fewer applicants than spaces  | All UAT-1 ids placed in LOT-E (car), first choice, peak < 90%, no flags                                                                                                                 |
| 2 More first-choice than spaces | LOT-A car early load = general capacity (13), filled in priority order; every displaced id has an `unmet` reason and is placed in choice 2/3 or suggested with `NEEDS_DECISION`         |
| 3 Night sharing with day staff  | UAT-3 night ids placed in LOT-A although early is full; night load counted separately; reason mentions the shared bay                                                                   |
| 4 Accessibility holder          | Holders in accessible bays up to capacity (2 per pool); the extra holder is in the nearest lot with a free accessible bay or has `NEEDS_DECISION`; never in a general bay automatically |
| 5 Hours "varies"                | Occupies all three windows; flag `HOURS_VARIES`; reason states the full-day assumption                                                                                                  |
| 6 No longer on campus           | `status: excluded`, flag `NO_LONGER_ON_CAMPUS`, on the decision list                                                                                                                    |
| 7 Same lot for every choice     | Choices collapsed; flag `SAME_LOT_ALL_CHOICES`; LOT-A full, so a suggestion with `NEEDS_DECISION`                                                                                       |

## Report (paste into the PR)

```markdown
### UAT

| Case  | Result | Evidence                                              |
| ----- | ------ | ----------------------------------------------------- |
| UAT-1 | ✅     | LOT-E car peak 38%; APP-0059..0066 placed, 1st choice |
| ...   |        |                                                       |

Invariants: ✅ accessible ≤ capacity · only holders · no inactive placed · reasons 100%
Commands: `npm run uat` (n passed), `npm run check:data`
```

Use ❌ with the failing assertion and a likely cause for any failure. Overall verdict: **UAT-ready** only when all 7 cases and all invariants pass.
