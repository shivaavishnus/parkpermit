/**
 * Hand-designed UAT fixture. Every row is tagged with the UAT case it exercises.
 * Lot A (Library Lot) is deliberately oversubscribed for cars.
 *
 * Car general capacity per lot = 25 - 2 accessible - 5 visitor - 5 reserved = 13 per shift window.
 */
const groups = [
  // ---- Lot A: oversubscribed (UAT-2) ----
  { n: 4, type: 'staff', home: ['A', 'A', 'B', 'B'], shift: 'early', prefs: ['LOT-A', 'LOT-B', 'LOT-C'], tags: ['UAT-2'] },
  { n: 4, type: 'faculty', home: ['A', 'B', 'A', 'C'], shift: 'early', prefs: ['LOT-A', 'LOT-B', 'LOT-C'], tags: ['UAT-2'] },
  { n: 4, type: 'contractor', home: ['A', 'A', 'B', 'B'], shift: 'early', prefs: ['LOT-A', 'LOT-C', 'LOT-B'], tags: ['UAT-2'] },
  { n: 4, type: 'student', home: ['A', 'B', 'A', 'B'], shift: 'early', prefs: ['LOT-A', 'LOT-B', 'LOT-D'], tags: ['UAT-2'] },
  // ---- "varies" hours (UAT-5) ----
  { n: 2, type: 'staff', home: ['A', 'B'], shift: 'Varies', prefs: ['LOT-A', 'LOT-B'], tags: ['UAT-2', 'UAT-5'] },
  { n: 1, type: 'faculty', home: ['A'], shift: 'varies', prefs: ['LOT-A', 'LOT-B'], tags: ['UAT-2', 'UAT-5'] },
  { n: 1, type: 'student', home: ['C'], shift: 'varies', prefs: ['LOT-A', 'LOT-C'], tags: ['UAT-2', 'UAT-5'] },
  // ---- Night shift sharing with day staff (UAT-3) ----
  { n: 3, type: 'staff', home: ['A', 'A', 'B'], shift: 'night', prefs: ['LOT-A', 'LOT-B'], tags: ['UAT-2', 'UAT-3'] },
  { n: 3, type: 'contractor', home: ['A', 'B', 'C'], shift: 'Night', prefs: ['LOT-A', 'LOT-B'], tags: ['UAT-2', 'UAT-3'] },
  // ---- Afternoon / evening ----
  { n: 3, type: ['faculty', 'contractor', 'student'], home: ['A', 'B', 'A'], shift: 'afternoon', prefs: ['LOT-A', 'LOT-B'], tags: ['UAT-2'] },
  // ---- Same lot for every choice (UAT-7) ----
  { n: 3, type: 'student', home: ['A', 'A', 'B'], shift: 'early', prefs: ['LOT-A', 'LOT-A', 'LOT-A'], tags: ['UAT-2', 'UAT-7'] },
  // ---- No longer on campus (UAT-6) ----
  { n: 2, type: ['staff', 'student'], home: ['A', 'B'], shift: 'early', prefs: ['LOT-A', 'LOT-B'], active: 'no', tags: ['UAT-6'] },
  // ---- Accessibility permit holders: 3 want Lot A, which has 2 accessible car bays (UAT-4) ----
  { n: 3, type: ['staff', 'faculty', 'student'], home: ['A', 'A', 'B'], shift: ['early', 'afternoon', 'early'], prefs: ['LOT-A', 'LOT-B'], acc: 'yes', tags: ['UAT-4'] },

  // ---- Lot B, C, D: moderate demand ----
  { n: 8, type: ['staff', 'faculty', 'student', 'contractor', 'faculty', 'student', 'staff', 'student'], home: ['B', 'B', 'C', 'B', 'A', 'B', 'C', 'B'], shift: ['early', 'early', 'early', 'early', 'early', 'afternoon', 'afternoon', 'night'], prefs: ['LOT-B', 'LOT-C'], tags: [] },
  { n: 7, type: ['faculty', 'staff', 'student', 'student', 'contractor', 'faculty', 'student'], home: ['C', 'C', 'D', 'C', 'B', 'C', 'D'], shift: ['early', 'early', 'early', 'early', 'afternoon', 'afternoon', 'night'], prefs: ['LOT-C', 'LOT-D'], tags: [] },
  { n: 6, type: ['staff', 'student', 'faculty', 'contractor', 'student', 'student'], home: ['D', 'D', 'C', 'D', 'D', 'E'], shift: ['early', 'early', 'afternoon', 'night', 'early', 'afternoon'], prefs: ['LOT-D', 'LOT-C'], tags: [] },

  // ---- Lot E: fewer applicants than spaces (UAT-1) ----
  { n: 8, type: ['staff', 'faculty', 'faculty', 'student', 'student', 'contractor', 'student', 'staff'], home: ['E', 'E', 'D', 'E', 'E', 'E', 'D', 'E'], shift: ['early', 'early', 'afternoon', 'early', 'afternoon', 'night', 'early', 'early'], prefs: ['LOT-E', 'LOT-D'], tags: ['UAT-1'] },

  // ---- Bikes ----
  { n: 5, type: ['student', 'student', 'faculty', 'staff', 'student'], home: ['A', 'A', 'B', 'A', 'A'], shift: 'early', prefs: ['LOT-A', 'LOT-B'], vehicle: 'bike', tags: [] },
  { n: 6, type: 'student', home: ['B', 'B', 'C', 'B', 'B', 'A'], shift: ['early', 'early', 'afternoon', 'afternoon', 'varies', 'early'], prefs: ['LOT-B', 'LOT-A'], vehicle: 'bike', tags: [] },
  { n: 6, type: ['student', 'faculty', 'student', 'staff', 'student', 'contractor'], home: ['C', 'C', 'C', 'D', 'C', 'C'], shift: 'afternoon', prefs: ['LOT-C', 'LOT-B'], vehicle: 'bike', tags: [] },
  { n: 3, type: 'student', home: ['D', 'D', 'E'], shift: 'early', prefs: ['LOT-D', 'LOT-E'], vehicle: 'bike', tags: [] },
  { n: 1, type: 'faculty', home: ['C'], shift: 'early', prefs: ['LOT-C'], vehicle: 'bike', acc: 'yes', tags: ['UAT-4'] },
];

const at = (v, i) => (Array.isArray(v) ? v[i % v.length] : v);

/** Expand groups into CSV rows and a tag index for expected.json. */
export function buildUatFixture(nameFor) {
  const rows = [];
  const tags = {};
  let i = 0;
  for (const g of groups) {
    for (let k = 0; k < g.n; k++) {
      i += 1;
      const id = `APP-${String(i).padStart(4, '0')}`;
      const prefs = g.prefs;
      rows.push({
        id,
        name: nameFor(i),
        type: at(g.type, k),
        home_block: at(g.home, k),
        vehicle: g.vehicle ?? 'car',
        shift: at(g.shift, k),
        pref_1: prefs[0] ?? '',
        pref_2: prefs[1] ?? '',
        pref_3: prefs[2] ?? '',
        accessibility_permit: g.acc ?? 'no',
        active_on_campus: g.active ?? 'yes',
      });
      for (const t of g.tags) (tags[t] ??= []).push(id);
    }
  }
  return { rows, tags };
}
