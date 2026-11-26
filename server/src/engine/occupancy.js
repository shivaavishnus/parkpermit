import { poolCapacity } from './capacity.js';

/**
 * Recompute occupancy from placements. Used after allocation and for every move preview,
 * so the numbers can never drift from the placements themselves.
 * @returns {import('./types.js').Occupancy}
 */
export function computeOccupancy({ lots, placements, applicantsById, config }) {
  const occ = {};
  for (const lot of lots) {
    occ[lot.lotId] = {};
    for (const vehicle of ['car', 'bike']) {
      const { generalCap, accessibleCap } = poolCapacity(lot[vehicle]);
      occ[lot.lotId][vehicle] = {
        generalCap,
        accessibleCap,
        load: Object.fromEntries(config.windows.map((w) => [w, 0])),
        accessibleUsed: 0,
        permits: 0,
        peak: 0,
        peakPct: 0,
        risk: false,
        over: false,
        shared: false,
      };
    }
  }
  for (const p of placements) {
    if (p.status !== 'placed' && p.status !== 'suggested') continue;
    const pool = occ[p.lotId]?.[applicantsById.get(p.appId)?.vehicle];
    if (!pool) continue;
    pool.permits += 1;
    if (p.bayType === 'accessible') pool.accessibleUsed += 1;
    else for (const w of applicantsById.get(p.appId).windows) pool.load[w] += 1;
  }
  for (const pools of Object.values(occ)) {
    for (const pool of Object.values(pools)) {
      const loads = Object.values(pool.load);
      pool.peak = Math.max(0, ...loads);
      pool.peakPct =
        pool.generalCap > 0 ? pool.peak / pool.generalCap : pool.peak > 0 ? Infinity : 0;
      pool.risk = pool.peakPct >= config.riskThreshold;
      pool.over = pool.peakPct > 1;
      pool.shared = loads.reduce((s, n) => s + n, 0) > pool.generalCap;
    }
  }
  return occ;
}

/** Lot-level flags derived from occupancy. */
export function lotFlags(lotOcc) {
  const flags = [];
  const pools = Object.values(lotOcc);
  if (pools.some((p) => p.risk)) flags.push('OVERCROWDING_RISK');
  if (pools.some((p) => p.over)) flags.push('OVER_CAPACITY');
  return flags;
}
