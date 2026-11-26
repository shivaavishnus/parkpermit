/** True if one more person with these windows fits in the pool's general bays. */
export function fitsGeneral(pool, windows) {
  return windows.every((w) => pool.load[w] + 1 <= pool.generalCap);
}

/** True if an accessible bay is free. Accessible bays are one holder each, never shared. */
export function fitsAccessible(pool) {
  return pool.accessibleUsed < pool.accessibleCap;
}

export class RuleViolation extends Error {
  /** @param {string[]} violations */
  constructor(violations) {
    super(`Allocation rule violated: ${violations.join('; ')}`);
    this.name = 'RuleViolation';
    this.violations = violations;
  }
}

/**
 * Hard rules that must hold after every run and every committed change.
 * Returns a list of violations (empty when valid).
 */
export function findViolations({ lots, placements, applicantsById, occupancy }) {
  const v = [];
  const lotIds = new Set(lots.map((l) => l.lotId));
  for (const p of placements) {
    const a = applicantsById.get(p.appId);
    if (!a) {
      v.push(`${p.appId}: unknown applicant`);
      continue;
    }
    if (!p.reason || !p.reason.trim()) v.push(`${p.appId}: missing reason`);
    const occupying = p.status === 'placed' || p.status === 'suggested';
    if (occupying && !lotIds.has(p.lotId)) v.push(`${p.appId}: placed in unknown lot`);
    if (occupying && !a.active) v.push(`${p.appId}: inactive applicant placed`);
    if (p.bayType === 'accessible' && !a.accessibility)
      v.push(`${p.appId}: non-holder in accessible bay`);
    if (occupying && p.bayType === 'none') v.push(`${p.appId}: placed without bay type`);
    if (!occupying && p.lotId !== null) v.push(`${p.appId}: ${p.status} but has a lot`);
  }
  for (const [lotId, pools] of Object.entries(occupancy)) {
    for (const [vehicle, pool] of Object.entries(pools)) {
      if (pool.accessibleUsed > pool.accessibleCap)
        v.push(`${lotId}/${vehicle}: accessible bays oversold`);
    }
  }
  const seen = new Set();
  for (const p of placements) {
    if (seen.has(p.appId)) v.push(`${p.appId}: duplicate placement`);
    seen.add(p.appId);
  }
  return v;
}

export function assertInvariants(input) {
  const violations = findViolations(input);
  if (violations.length) throw new RuleViolation(violations);
}
