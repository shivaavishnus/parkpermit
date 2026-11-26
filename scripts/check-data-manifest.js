#!/usr/bin/env node
/**
 * Real-data guard. Fails if any file under data/ (outside data/generator/) is missing from
 * data/MANIFEST.json or no longer matches its recorded hash. Only the synthetic generator
 * writes the manifest, so an unknown or edited file means it did not come from the generator.
 *
 *   npm run check:data
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const SKIP = new Set(['generator', 'MANIFEST.json', '.DS_Store', '.gitkeep']);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const manifestPath = join(DATA_DIR, 'MANIFEST.json');
if (!existsSync(manifestPath)) {
  console.error('data/MANIFEST.json is missing. Run `npm run gen:data`.');
  process.exit(1);
}
const { files: manifest = {} } = JSON.parse(readFileSync(manifestPath, 'utf8'));
const problems = [];

for (const path of walk(DATA_DIR)) {
  const key = relative(DATA_DIR, path).split(sep).join('/');
  const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
  if (!manifest[key]) problems.push(`not produced by the generator: data/${key}`);
  else if (manifest[key] !== hash) problems.push(`edited after generation: data/${key}`);
}
for (const key of Object.keys(manifest)) {
  if (!existsSync(join(DATA_DIR, key)))
    problems.push(`listed in manifest but missing: data/${key}`);
}

if (problems.length) {
  console.error('Real-data guard failed:');
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    'Synthetic data only: regenerate with `npm run gen:data` instead of adding or editing files.',
  );
  process.exit(1);
}
console.log(`Real-data guard OK: ${Object.keys(manifest).length} files match data/MANIFEST.json.`);
