import { allocationConfig } from '../config/allocation.js';

export const APPLICATION_HEADERS = [
  'id', 'name', 'type', 'home_block', 'vehicle', 'shift',
  'pref_1', 'pref_2', 'pref_3', 'accessibility_permit', 'active_on_campus',
];
export const LOT_HEADERS = [
  'lot_id', 'name', 'block',
  'car_total', 'car_accessible', 'car_visitor', 'car_reserved',
  'bike_total', 'bike_accessible', 'bike_visitor', 'bike_reserved',
];

const TYPES = ['staff', 'faculty', 'contractor', 'student'];
const VEHICLES = ['car', 'bike'];
const VARIES_WORDS = ['varies', 'various', 'variable', 'flexible', 'vary', ''];
const YES = ['yes', 'y', 'true', '1'];
const NO = ['no', 'n', 'false', '0'];

function yesNo(raw) {
  const v = String(raw ?? '').trim().toLowerCase();
  if (YES.includes(v)) return true;
  if (NO.includes(v)) return false;
  return null;
}

function missingHeaders(headers, required) {
  return required.filter((h) => !headers.includes(h));
}

/**
 * Validate and normalise lots.csv rows.
 * @returns {{ lots: any[], errors: any[], warnings: any[] }}
 */
export function normaliseLots({ rows, headers }) {
  const errors = [];
  const warnings = [];
  const missing = missingHeaders(headers, LOT_HEADERS);
  if (missing.length) {
    errors.push({ file: 'lots', row: 1, field: missing.join(','), message: `Missing columns: ${missing.join(', ')}` });
    return { lots: [], errors, warnings };
  }
  const distCols = headers.filter((h) => /^dist_[a-z0-9]+$/.test(h));
  if (!distCols.length)
    warnings.push({ file: 'lots', row: 1, field: 'dist_*', message: 'No distance columns; tie-break by distance is disabled.' });
  if (headers.includes('past_peak_count'))
    warnings.push({
      file: 'lots',
      row: 1,
      field: 'past_peak_count',
      message: 'Past occupancy counts include visitors and contractors; they are shown for context only and not used in capacity.',
    });

  const lots = [];
  const seen = new Set();
  rows.forEach((r, i) => {
    const row = i + 2;
    const lotId = String(r.lot_id ?? '').toUpperCase();
    if (!lotId) return errors.push({ file: 'lots', row, field: 'lot_id', message: 'lot_id is required.' });
    if (seen.has(lotId)) return errors.push({ file: 'lots', row, field: 'lot_id', message: `Duplicate lot_id ${lotId}.` });
    seen.add(lotId);
    const pool = (prefix) => {
      const spec = {};
      for (const k of ['total', 'accessible', 'visitor', 'reserved']) {
        const n = Number(r[`${prefix}_${k}`]);
        if (!Number.isInteger(n) || n < 0) {
          errors.push({ file: 'lots', row, field: `${prefix}_${k}`, message: `${prefix}_${k} must be a whole number >= 0.` });
          spec[k] = 0;
        } else spec[k] = n;
      }
      if (spec.accessible + spec.visitor + spec.reserved > spec.total)
        errors.push({ file: 'lots', row, field: `${prefix}_total`, message: `${prefix} accessible + visitor + reserved exceed total.` });
      return spec;
    };
    const distances = {};
    for (const c of distCols) {
      const n = Number(r[c]);
      if (r[c] === '' || r[c] === undefined) continue;
      if (!Number.isFinite(n) || n < 0) errors.push({ file: 'lots', row, field: c, message: `${c} must be a number >= 0.` });
      else distances[c.slice(5).toUpperCase()] = n;
    }
    const ppc = r.past_peak_count;
    lots.push({
      lotId,
      name: r.name || lotId,
      block: String(r.block ?? '').toUpperCase(),
      car: pool('car'),
      bike: pool('bike'),
      distances,
      pastPeakCount: ppc === undefined || ppc === '' ? null : Number(ppc),
    });
  });
  return { lots, errors, warnings };
}

/**
 * Validate and normalise applications.csv rows, handling the known data issues:
 * "varies" hours, same lot for every choice, no longer on campus.
 */
export function normaliseApplications({ rows, headers }, lotIds, config = allocationConfig) {
  const errors = [];
  const warnings = [];
  const issues = { hoursVaries: 0, sameLotAllChoices: 0, noLongerOnCampus: 0, duplicatePrefs: 0 };
  const missing = missingHeaders(headers, APPLICATION_HEADERS);
  if (missing.length) {
    errors.push({ file: 'applications', row: 1, field: missing.join(','), message: `Missing columns: ${missing.join(', ')}` });
    return { applicants: [], errors, warnings, issues };
  }
  const known = new Set(lotIds);
  const seen = new Set();
  const applicants = [];
  rows.forEach((r, i) => {
    const row = i + 2;
    const err = (field, message) => errors.push({ file: 'applications', row, field, message });
    const appId = String(r.id ?? '').toUpperCase();
    if (!appId) return err('id', 'id is required.');
    if (seen.has(appId)) return err('id', `Duplicate id ${appId}.`);
    seen.add(appId);
    const before = errors.length;
    const dataFlags = [];

    const type = String(r.type ?? '').toLowerCase();
    if (!TYPES.includes(type)) err('type', `type must be one of ${TYPES.join(', ')}.`);
    const vehicle = String(r.vehicle ?? '').toLowerCase();
    if (!VEHICLES.includes(vehicle)) err('vehicle', 'vehicle must be car or bike.');
    const homeBlock = String(r.home_block ?? '').toUpperCase();
    if (!homeBlock) err('home_block', 'home_block is required.');

    let shift = String(r.shift ?? '').toLowerCase();
    if (VARIES_WORDS.includes(shift)) {
      shift = 'varies';
      dataFlags.push('HOURS_VARIES');
      issues.hoursVaries++;
    } else if (!config.shiftWindows[shift]) err('shift', 'shift must be early, afternoon, night or varies.');

    const rawPrefs = ['pref_1', 'pref_2', 'pref_3'].map((k) => String(r[k] ?? '').toUpperCase()).filter(Boolean);
    if (!rawPrefs.length) err('pref_1', 'pref_1 is required.');
    for (const p of rawPrefs) if (!known.has(p)) err('pref', `Unknown lot ${p}.`);
    const prefs = [...new Set(rawPrefs)];
    if (rawPrefs.length >= 2 && prefs.length === 1) {
      dataFlags.push('SAME_LOT_ALL_CHOICES');
      issues.sameLotAllChoices++;
    } else if (prefs.length < rawPrefs.length) {
      issues.duplicatePrefs++;
      warnings.push({ file: 'applications', row, field: 'pref', message: `${appId}: repeated lot choices were collapsed.` });
    }

    const accessibility = yesNo(r.accessibility_permit === '' ? 'no' : r.accessibility_permit);
    if (accessibility === null) err('accessibility_permit', 'accessibility_permit must be yes or no.');
    const active = yesNo(r.active_on_campus);
    if (active === null) err('active_on_campus', 'active_on_campus must be yes or no.');
    if (active === false) {
      dataFlags.push('NO_LONGER_ON_CAMPUS');
      issues.noLongerOnCampus++;
    }
    if (errors.length > before) return;

    applicants.push({
      appId,
      name: r.name ?? '',
      type,
      homeBlock,
      vehicle,
      shift,
      shiftRaw: r.shift ?? '',
      windows: [...config.shiftWindows[shift]],
      prefs,
      accessibility,
      active,
      dataFlags,
    });
  });
  return { applicants, errors, warnings, issues };
}
