#!/usr/bin/env node
/**
 * UAT coverage report for a synthetic dataset. Read-only.
 * Prints which UAT case each fixture group exercises, the data-issue counts, and the
 * first-choice demand per lot, vehicle and shift window against general capacity.
 * Exits 1 if a UAT case has no rows or no lot is oversubscribed.
 *
 *   node scripts/uat-coverage.js                                  # UAT fixture
 *   node scripts/uat-coverage.js --dir data/samples/term-seed42   # any generated set
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ingest } from '../server/src/ingest/index.js';
import { buildCapacity } from '../server/src/engine/capacity.js';
import { allocationConfig as config } from '../server/src/config/allocation.js';

const argv = process.argv.slice(2);
const i = argv.indexOf('--dir');
const dir = resolve(i === -1 ? 'data/fixtures/uat' : argv[i + 1]);

const data = ingest({
  applicationsCsv: readFileSync(join(dir, 'applications.csv'), 'utf8'),
  lotsCsv: readFileSync(join(dir, 'lots.csv'), 'utf8'),
});
if (data.errors.length) {
  console.error(
    `Blocking validation errors (${data.errors.length}); first: ${JSON.stringify(data.errors[0])}`,
  );
  process.exit(1);
}

let failed = false;
const expectedPath = join(dir, 'expected.json');
if (existsSync(expectedPath)) {
  const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));
  console.log('UAT case  Rows  Lot     Sample ids');
  for (let n = 1; n <= 7; n++) {
    const c = expected[`UAT-${n}`];
    const ids = c?.applicants ?? [];
    if (!ids.length) failed = true;
    console.log(
      `UAT-${n}     ${String(ids.length).padStart(4)}  ${(c?.lot ?? '-').padEnd(6)}  ${ids.slice(0, 4).join(', ')}${ids.length > 4 ? ', ...' : ''}${ids.length ? '' : '  <-- MISSING'}`,
    );
  }
  console.log('');
}

const apps = data.applicants;
const count = (f) => apps.filter(f).length;
console.log(
  `Applicants ${apps.length}: varies ${count((a) => a.shift === 'varies')}, ` +
    `same lot every choice ${count((a) => a.dataFlags.includes('SAME_LOT_ALL_CHOICES'))}, ` +
    `inactive ${count((a) => !a.active)}, accessibility holders ${count((a) => a.accessibility)}, ` +
    `night ${count((a) => a.shift === 'night')}`,
);

const cap = buildCapacity(data.lots, config);
const demand = {};
for (const a of apps) {
  if (!a.active || a.accessibility || !a.prefs[0]) continue;
  const key = `${a.prefs[0]}|${a.vehicle}`;
  demand[key] ??= Object.fromEntries(config.windows.map((w) => [w, 0]));
  for (const w of a.windows) demand[key][w] += 1;
}
console.log('\nFirst-choice demand vs general capacity (active, non-accessibility)');
console.log('Lot     Pool  Cap  Early  Aft  Night  Status');
let oversubscribed = 0;
for (const lot of data.lots) {
  for (const v of ['car', 'bike']) {
    const d = demand[`${lot.lotId}|${v}`] ?? { early: 0, afternoon: 0, night: 0 };
    const c = cap[lot.lotId][v].generalCap;
    const over = config.windows.some((w) => d[w] > c);
    if (over) oversubscribed += 1;
    console.log(
      `${lot.lotId.padEnd(7)} ${v.padEnd(5)} ${String(c).padStart(3)}  ${String(d.early).padStart(5)}  ${String(d.afternoon).padStart(3)}  ${String(d.night).padStart(5)}  ${over ? 'OVERSUBSCRIBED' : ''}`,
    );
  }
}
if (!oversubscribed) {
  console.error('\nNo lot is oversubscribed: the dataset must have at least one (UAT-2).');
  failed = true;
}
process.exit(failed ? 1 : 0);
