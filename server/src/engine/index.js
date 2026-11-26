import { buildCapacity } from './capacity.js';
import { fitsAccessible, fitsGeneral, assertInvariants } from './checks.js';
import { computeOccupancy } from './occupancy.js';
import { placementReason, unmetReason, UNMET_CAUSE } from './reasons.js';
import { priorityComparator, groupComparator, lotsByDistance, compareIds } from './sort.js';
import { summarise } from './summary.js';

export { computeOccupancy, lotFlags } from './occupancy.js';
export { findViolations, assertInvariants, RuleViolation } from './checks.js';
export { previewMove, applyMove, restorePlacement } from './moves.js';
export { resolveDecision, DECISION_ACTIONS } from './decisions.js';
export { summarise } from './summary.js';

/**
 * Propose an allocation. Pure and deterministic: same input -> same output.
 *
 * Order: exclusions -> accessibility pass (accessible bays only) -> general pass in
 * choice-rank rounds -> fallback suggestions -> reasons -> invariants.
 *
 * @param {{ lots: import('./types.js').Lot[], applicants: import('./types.js').Applicant[], config: any }} input
 */
export function allocate({ lots, applicants, config }) {
  const sortedLots = [...lots].sort((a, b) => compareIds(a.lotId, b.lotId));
  const lotById = new Map(sortedLots.map((l) => [l.lotId, l]));
  const applicantsById = new Map(applicants.map((a) => [a.appId, a]));
  const state = buildCapacity(sortedLots, config);
  /** @type {Map<string, import('./types.js').Placement>} */
  const out = new Map();
  const unmet = new Map(applicants.map((a) => [a.appId, []]));

  const make = (a, fields) => ({
    appId: a.appId,
    lotId: null,
    bayType: 'none',
    status: 'unplaced',
    choiceRank: null,
    flags: [...a.dataFlags],
    reason: '',
    unmet: unmet.get(a.appId),
    resolved: false,
    byAdmin: false,
    decision: null,
    ...fields,
  });

  const place = (a, lotId, bayType, status, choiceRank) => {
    const pool = state[lotId][a.vehicle];
    if (bayType === 'accessible') pool.accessibleUsed += 1;
    else for (const w of a.windows) pool.load[w] += 1;
    pool.members.push({ appId: a.appId, bayType, choiceRank, type: a.type, windows: a.windows });
    out.set(a.appId, make(a, { lotId, bayType, status, choiceRank }));
  };

  const causeFor = (a, lotId, rank, bayType) => {
    const pool = state[lotId][a.vehicle];
    if (bayType === 'accessible') return UNMET_CAUSE.ACCESSIBLE_FULL;
    if (pool.generalCap === 0) return UNMET_CAUSE.NO_CAPACITY;
    const blockers = pool.members.filter(
      (m) => m.bayType === 'general' && m.windows.some((w) => a.windows.includes(w)),
    );
    if (blockers.some((m) => m.choiceRank !== null && m.choiceRank < rank))
      return UNMET_CAUSE.EARLIER_CHOICE;
    if (blockers.some((m) => config.typeRank[m.type] < config.typeRank[a.type]))
      return UNMET_CAUSE.HIGHER_PRIORITY;
    return UNMET_CAUSE.SAME_GROUP_CLOSER;
  };

  const fits = (a, lotId, bayType) => {
    const pool = state[lotId]?.[a.vehicle];
    if (!pool) return false;
    return bayType === 'accessible' ? fitsAccessible(pool) : fitsGeneral(pool, a.windows);
  };

  /** Choice-rank rounds: every first choice is tried before any second choice. */
  const runRounds = (candidates, bayType) => {
    for (let rank = 1; rank <= config.maxChoices; rank++) {
      for (const lot of sortedLots) {
        const group = candidates
          .filter((a) => !out.has(a.appId) && a.prefs[rank - 1] === lot.lotId)
          .sort(priorityComparator(lot, config));
        for (const a of group) {
          if (fits(a, lot.lotId, bayType)) place(a, lot.lotId, bayType, 'placed', rank);
          else
            unmet.get(a.appId).push({
              lotId: lot.lotId,
              rank,
              cause: causeFor(a, lot.lotId, rank, bayType),
              reason: '',
            });
        }
      }
    }
  };

  /** Nearest lot (to home block) outside the applicant's choices -> suggestion. */
  const runFallback = (candidates, bayType) => {
    for (const a of [...candidates].sort(groupComparator(config))) {
      if (out.has(a.appId)) continue;
      const target = lotsByDistance(sortedLots, a.homeBlock).find(
        (l) => !a.prefs.includes(l.lotId) && fits(a, l.lotId, bayType),
      );
      if (target) place(a, target.lotId, bayType, 'suggested', null);
    }
  };

  // 1. Exclusions
  for (const a of applicants) {
    if (!a.active) {
      const flags = a.dataFlags.includes('NO_LONGER_ON_CAMPUS')
        ? [...a.dataFlags]
        : [...a.dataFlags, 'NO_LONGER_ON_CAMPUS'];
      out.set(a.appId, make(a, { status: 'excluded', flags }));
    }
  }
  const active = applicants.filter((a) => a.active);
  const holders = active.filter((a) => a.accessibility);
  const general = active.filter((a) => !a.accessibility);

  // 2. Accessibility first, accessible bays only
  runRounds(holders, 'accessible');
  runFallback(holders, 'accessible');
  // 3. General pass with shift sharing
  runRounds(general, 'general');
  runFallback(general, 'general');

  // 4. Remaining -> unplaced
  for (const a of active) if (!out.has(a.appId)) out.set(a.appId, make(a, {}));

  // 5. Decision flag
  for (const p of out.values()) {
    if ((p.status === 'suggested' || p.status === 'unplaced') && !p.flags.includes('NEEDS_DECISION'))
      p.flags.push('NEEDS_DECISION');
  }

  const placements = [...out.values()].sort((x, y) => compareIds(x.appId, y.appId));
  const occupancy = computeOccupancy({ lots: sortedLots, placements, applicantsById, config });

  // 6. Reasons
  const lotNameOf = (id) => lotById.get(id)?.name ?? id;
  for (const p of placements) {
    const a = applicantsById.get(p.appId);
    for (const u of p.unmet)
      u.reason = unmetReason(
        { lotName: lotNameOf(u.lotId), rank: u.rank, cause: u.cause, shift: a.shift, vehicle: a.vehicle },
        config,
      );
    p.reason = placementReason({
      placement: p,
      applicant: a,
      lotNameOf,
      pool: p.lotId ? occupancy[p.lotId][a.vehicle] : null,
      config,
    });
  }

  // 7. Invariants
  assertInvariants({ lots: sortedLots, placements, applicantsById, occupancy });

  return {
    placements,
    occupancy,
    summary: summarise({ placements, applicantsById, occupancy }),
  };
}
