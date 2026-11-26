---
name: write-tests
description: Write or extend ParkPermit test scripts with Vitest — engine unit, determinism and invariant tests, ingest tests, the UAT-1..7 suite, Supertest API tests with mongodb-memory-server, and React Testing Library client tests. Use when adding a feature or fixing a bug, when coverage drops below 90%, or when asked to "add tests", "write test scripts" or "test the engine".
---

# Write tests

Vitest everywhere. The engine (`server/src/engine/`) needs **≥ 90% coverage**, enforced by
`server/vitest.config.js`, which counts lines, branches, functions and statements and excludes `cli.js`.

## Layout and commands

| Folder                        | What                                                                                          | Command                         |
| ----------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------- |
| `server/test/engine/`         | One `<module>.test.js` per engine module, plus `determinism.test.js` and `invariants.test.js` | `npm run test:engine -w server` |
| `server/test/ingest/`         | `parseCsv`, `normalise` (known data issues)                                                   | same as engine                  |
| `server/test/uat/uat.test.js` | UAT-1..7 against `data/fixtures/uat`                                                          | `npm run uat`                   |
| `server/test/api/`            | Routes via Supertest + mongodb-memory-server                                                  | `npm test -w server`            |
| `server/test/helpers/`        | Shared builders (`build.js`) and fixture loader                                               | —                               |
| `client/src/__tests__/`       | Components and pages (Testing Library, jsdom)                                                 | `npm test -w client`            |

Coverage: `npx vitest run --coverage -w server`.

## Rules

1. **Test behaviour against the rules.** Name each test after the rule it proves
   (`BR-3: night holder fits when early window is full`). Business rules are in
   `docs/PRD.md` §6 and `docs/ARCHITECTURE.md` §5.
2. **Never edit `data/fixtures/uat/expected.json`** to make a test pass. If an expectation looks
   wrong, stop and ask the user.
3. **No real data.** Build inputs with the helpers below or load the generated fixture.
4. **Deterministic tests**: no timers, no `Math.random`, no network. Use `vi.useFakeTimers()` only in API tests that need time.
5. Read the config from `server/src/config/allocation.js`; do not hard-code capacities or shift
   windows. Derive numbers from the lot spec in the test, e.g. `cap = total - accessible - visitor - reserved`.
6. Every new engine branch needs a test, including error paths (`RuleViolation`).
7. Use `it.each` for tables of cases (shift → windows, type → rank).

## Shared builders (`server/test/helpers/build.js`)

Create this file if it does not exist. The engine works on normalised objects (see
`server/src/engine/types.js`), so tests can skip CSV parsing.

```js
import { allocationConfig as config } from '../../src/config/allocation.js';
export { config };

const pool = (o = {}) => ({ total: 25, accessible: 2, visitor: 5, reserved: 0, ...o });
const BLOCKS = ['A', 'B', 'C', 'D', 'E'];

/** @returns {import('../../src/engine/types.js').Lot} */
export function lot(id, o = {}) {
  const block = id.slice(-1);
  return {
    lotId: `LOT-${block}`,
    name: `${block} Lot`,
    block,
    car: pool({ reserved: 5, ...o.car }),
    bike: pool(o.bike),
    distances: Object.fromEntries(
      BLOCKS.map((b) => [b, Math.abs(b.charCodeAt(0) - block.charCodeAt(0)) * 200]),
    ),
    pastPeakCount: null,
    ...o.extra,
  };
}

let n = 0;
/** @returns {import('../../src/engine/types.js').Applicant} */
export function app(o = {}) {
  const shift = o.shift ?? 'early';
  return {
    appId: o.appId ?? `APP-${String(++n).padStart(4, '0')}`,
    type: 'staff',
    homeBlock: 'A',
    vehicle: 'car',
    shift,
    windows: config.shiftWindows[shift],
    prefs: ['LOT-A'],
    accessibility: false,
    active: true,
    dataFlags: [],
    ...o,
  };
}
export const many = (k, o) => Array.from({ length: k }, () => app(o));
export const byId = (result) => new Map(result.placements.map((p) => [p.appId, p]));
```

Reset `n` in `beforeEach` if ids matter, or pass explicit `appId`s.

## Templates

### Engine unit test

```js
import { describe, it, expect } from 'vitest';
import { allocate } from '../../src/engine/index.js';
import { lot, app, many, byId, config } from '../helpers/build.js';

describe('general pass (BR-3)', () => {
  it('night holder shares a bay when the early window is full', () => {
    const lots = [lot('A'), lot('B')];
    const early = many(13, { shift: 'early' });
    const night = app({ appId: 'APP-0900', shift: 'night' });
    const r = allocate({ lots, applicants: [...early, night], config });
    expect(byId(r).get('APP-0900')).toMatchObject({
      lotId: 'LOT-A',
      status: 'placed',
      bayType: 'general',
    });
    expect(r.occupancy['LOT-A'].car.load).toEqual({ early: 13, afternoon: 0, night: 1 });
  });
});
```

### Determinism (`determinism.test.js`)

Run `allocate` twice on the same input, and once more on **shuffled** applicants and lots, using a
fixed permutation, not `Math.random`. Assert `toEqual` on placements, occupancy and summary.

### Invariants (`invariants.test.js`)

After `allocate` and after every `applyMove`, `resolveDecision` and `restorePlacement`, assert:

- `accessibleUsed ≤ accessibleCap` for every pool;
- every `bayType === 'accessible'` placement belongs to a holder (`accessibility === true`);
- no inactive applicant has `status` `placed` or `suggested` unless reinstated;
- every placement and every `unmet` entry has a non-empty one-sentence `reason`;
- no reason mentions another applicant's id;
- the engine never reads `name`. Pass applicants with a `name` getter that throws:
  `Object.defineProperty(a, 'name', { get() { throw new Error('name read'); } })`.
  Also prove that moving a non-holder into an accessible bay throws `RuleViolation`, and that no override bypasses it.

### Ingest test

Feed CSV strings to `ingest({ applicationsCsv, lotsCsv })`. Cover: BOM, `Varies ` with case and
spaces → `varies` + `HOURS_VARIES`; `A,A,A` → collapsed + `SAME_LOT_ALL_CHOICES`;
`active_on_campus=no` → `NO_LONGER_ON_CAMPUS`; unknown lot, bad enum and missing id → row-level
`errors` with row numbers; `past_peak_count` is never used in capacity.

### UAT suite (`server/test/uat/uat.test.js`)

Load the fixture once in `beforeAll` (ingest the two CSVs, then `allocate`) and read
`expected.json`. Write one `describe('UAT-n …')` per case, asserting the expected result column
of `docs/PRD.md` §8. For example, UAT-2: LOT-A car early load equals `generalCap`, the placed
members are the highest-priority applicants, and every displaced applicant has an `unmet` reason.
UAT-4: every holder is in an accessible bay or has `NEEDS_DECISION`.

### API test

```js
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';

let mongo, app, agent;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
  agent = request.agent(app); // keeps the httpOnly session cookie
  await agent
    .post('/api/auth/login')
    .send({ email: 'admin@parkpermit.test', password: 'test-pass' })
    .expect(200);
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
```

For every route, cover 401 without a session, `VALIDATION` on bad input, and the happy path. For
moves, also cover `CONFLICT_VERSION` on a stale `expectedVersion`, `RULE_BLOCKED` on accessible-bay
violations, and check that an `AuditEvent` was written. Error bodies must match
`{ error: { code, message, details } }`.

### Client test

Use `render` and `screen` from Testing Library with `userEvent`. Query by role and accessible
name, not by test id. Assert that occupancy is never conveyed by colour alone (the text `92%` or a
status word is present), that dialogs trap focus, and that errors are announced through
`role="alert"`.

## Done when

- New behaviour has tests that fail without the change.
- `npm run test:engine -w server` passes with coverage ≥ 90%, and `npm run uat` is green.
- `npm run lint` passes.
- Summarise in the reply: tests added, the rules they cover, and the coverage figure.
