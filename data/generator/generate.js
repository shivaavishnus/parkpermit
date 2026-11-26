#!/usr/bin/env node
/**
 * Synthetic data generator for ParkPermit. SYNTHETIC ONLY - never import real data.
 *
 *   node data/generator/generate.js                    # UAT fixture + default sample
 *   node data/generator/generate.js --seed 7 --size 300 --out data/samples/big
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLots, BLOCKS } from './lots.js';
import { nameFor } from './names.js';
import { buildUatFixture } from './scenarios.js';

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Small deterministic PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weighted(rand, entries) {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of entries) if ((r -= w) < 0) return v;
  return entries[entries.length - 1][0];
}

export function toCsv(rows) {
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n') + '\n';
}

/** Random-but-seeded term. Block A is popular, so Library Lot is oversubscribed. */
export function buildSample({ seed = 42, size = 180 } = {}) {
  const rand = rng(seed);
  const rows = [];
  for (let i = 1; i <= size; i++) {
    const home = weighted(rand, [['A', 30], ['B', 25], ['C', 20], ['D', 15], ['E', 10]]);
    const first = rand() < 0.45 ? 'A' : home;
    const others = BLOCKS.filter((b) => b !== first).sort(
      (x, y) => Math.abs(x.charCodeAt(0) - home.charCodeAt(0)) - Math.abs(y.charCodeAt(0) - home.charCodeAt(0)),
    );
    let prefs = [first, others[0], others[1]];
    if (rand() < 0.03) prefs = [first, first, first];
    rows.push({
      id: `APP-${String(i).padStart(4, '0')}`,
      name: nameFor(i),
      type: weighted(rand, [['staff', 20], ['faculty', 25], ['contractor', 10], ['student', 45]]),
      home_block: home,
      vehicle: rand() < 0.75 ? 'car' : 'bike',
      shift: weighted(rand, [['early', 40], ['afternoon', 25], ['night', 15], ['varies', 10], ['Varies ', 2]]),
      pref_1: `LOT-${prefs[0]}`,
      pref_2: `LOT-${prefs[1]}`,
      pref_3: `LOT-${prefs[2]}`,
      accessibility_permit: rand() < 0.03 ? 'yes' : 'no',
      active_on_campus: rand() < 0.04 ? 'no' : 'yes',
    });
  }
  return rows;
}

function writeSet(dir, files) {
  mkdirSync(dir, { recursive: true });
  const written = [];
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name);
    writeFileSync(path, content);
    written.push(path);
  }
  return written;
}

function updateManifest(paths) {
  const manifestPath = join(DATA_DIR, 'MANIFEST.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { files: {} };
  for (const p of paths) {
    manifest.files[relative(DATA_DIR, p)] = createHash('sha256').update(readFileSync(p)).digest('hex');
  }
  manifest.files = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

function main(argv) {
  const arg = (k, d) => {
    const i = argv.indexOf(`--${k}`);
    return i === -1 ? d : argv[i + 1];
  };
  const seed = Number(arg('seed', 42));
  const size = Number(arg('size', 180));
  const out = arg('out', null);
  const lotsCsv = toCsv(buildLots());
  const written = [];

  if (!out) {
    const { rows, tags } = buildUatFixture(nameFor);
    const expected = {
      note: 'UAT-1..7 fixture membership. Assertions live in server/test/uat/uat.test.js.',
      'UAT-1': { lot: 'LOT-E', vehicle: 'car', applicants: tags['UAT-1'] },
      'UAT-2': { lot: 'LOT-A', vehicle: 'car', window: 'early', applicants: tags['UAT-2'] },
      'UAT-3': { lot: 'LOT-A', vehicle: 'car', applicants: tags['UAT-3'] },
      'UAT-4': { lot: 'LOT-A', applicants: tags['UAT-4'] },
      'UAT-5': { applicants: tags['UAT-5'] },
      'UAT-6': { applicants: tags['UAT-6'] },
      'UAT-7': { lot: 'LOT-A', applicants: tags['UAT-7'] },
    };
    written.push(
      ...writeSet(join(DATA_DIR, 'fixtures/uat'), {
        'applications.csv': toCsv(rows),
        'lots.csv': lotsCsv,
        'expected.json': JSON.stringify(expected, null, 2) + '\n',
      }),
    );
    console.log(`UAT fixture: ${rows.length} applicants -> data/fixtures/uat`);
    for (const [k, v] of Object.entries(tags).sort()) console.log(`  ${k}: ${v.length} rows`);
  }
  const sampleDir = out ? resolve(out) : join(DATA_DIR, `samples/term-seed${seed}`);
  written.push(
    ...writeSet(sampleDir, { 'applications.csv': toCsv(buildSample({ seed, size })), 'lots.csv': lotsCsv }),
  );
  console.log(`Sample: ${size} applicants (seed ${seed}) -> ${relative(process.cwd(), sampleDir)}`);
  updateManifest(written.filter((p) => p.startsWith(DATA_DIR)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
