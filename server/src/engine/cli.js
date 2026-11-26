#!/usr/bin/env node
/**
 * Read-only engine runner (no database). Used by the run-allocation skill.
 *   node server/src/engine/cli.js --apps data/fixtures/uat/applications.csv --lots data/fixtures/uat/lots.csv
 *   ... --explain APP-0007     one applicant's outcome
 *   ... --json out.json        write full result
 *   ... --diff previous.json   placements that changed
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { ingest } from '../ingest/index.js';
import { allocationConfig } from '../config/allocation.js';
import { allocate } from './index.js';

const argv = process.argv.slice(2);
const arg = (k) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? null : argv[i + 1];
};
const appsPath = arg('apps') ?? 'data/fixtures/uat/applications.csv';
const lotsPath = arg('lots') ?? 'data/fixtures/uat/lots.csv';

const data = ingest({
  applicationsCsv: readFileSync(appsPath, 'utf8'),
  lotsCsv: readFileSync(lotsPath, 'utf8'),
});
if (data.errors.length) {
  console.error('Blocking validation errors:');
  for (const e of data.errors) console.error(`  ${e.file} row ${e.row} ${e.field}: ${e.message}`);
  process.exit(1);
}
const result = allocate({ lots: data.lots, applicants: data.applicants, config: allocationConfig });
const byId = new Map(result.placements.map((p) => [p.appId, p]));

const explain = arg('explain');
if (explain) {
  const p = byId.get(explain.toUpperCase());
  if (!p) {
    console.error(`No applicant ${explain}`);
    process.exit(1);
  }
  console.log(JSON.stringify(p, null, 2));
  process.exit(0);
}

const pct = (x) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : 'inf');
console.log(`Warnings: ${data.warnings.length}  Issues: ${JSON.stringify(data.summary.issues)}\n`);
console.log('Lot     Pool  Cap  Early  Aft  Night  Peak  Acc   Permits  Flags');
for (const [lotId, pools] of Object.entries(result.occupancy)) {
  for (const [v, p] of Object.entries(pools)) {
    const flags = [p.over && 'OVER', p.risk && 'RISK', p.shared && 'shared'].filter(Boolean).join(',');
    console.log(
      `${lotId.padEnd(7)} ${v.padEnd(5)} ${String(p.generalCap).padStart(3)}  ${String(p.load.early).padStart(5)}  ${String(p.load.afternoon).padStart(3)}  ${String(p.load.night).padStart(5)}  ${pct(p.peakPct).padStart(4)}  ${p.accessibleUsed}/${p.accessibleCap}  ${String(p.permits).padStart(7)}  ${flags}`,
    );
  }
}
const s = result.summary;
console.log(
  `\nPlaced ${s.placed}, suggested ${s.suggested}, unplaced ${s.unplaced}, excluded ${s.excluded}; in a chosen lot ${pct(s.inChoicePct)} (1st ${s.byChoiceRank[1]}, 2nd ${s.byChoiceRank[2]}, 3rd ${s.byChoiceRank[3]})`,
);
console.log(
  `Accessibility: ${s.accessibility.inAccessibleBay}/${s.accessibility.holders} in accessible bays, pending ${s.accessibility.pending} -> ${s.accessibility.ok ? 'OK' : 'ATTENTION'}`,
);
console.log(`\nDecision list (${s.openDecisions}):`);
for (const p of result.placements.filter(
  (p) => (p.flags.includes('NEEDS_DECISION') || p.flags.includes('NO_LONGER_ON_CAMPUS')) && !p.resolved,
))
  console.log(`  ${p.appId} [${p.status}${p.lotId ? ' ' + p.lotId : ''}] ${p.flags.join(',')} - ${p.reason}`);

const diff = arg('diff');
if (diff) {
  const prev = new Map(JSON.parse(readFileSync(diff, 'utf8')).placements.map((p) => [p.appId, p]));
  console.log('\nChanged placements:');
  for (const p of result.placements) {
    const q = prev.get(p.appId);
    if (!q || q.lotId !== p.lotId || q.status !== p.status || q.bayType !== p.bayType)
      console.log(`  ${p.appId}: ${q ? `${q.status} ${q.lotId}` : 'new'} -> ${p.status} ${p.lotId}`);
  }
}
const json = arg('json');
if (json) writeFileSync(json, JSON.stringify(result, null, 2));
