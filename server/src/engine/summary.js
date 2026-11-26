/** Dashboard KPIs from placements and occupancy. */
export function summarise({ placements, applicantsById, occupancy }) {
  const considered = placements.filter((p) => p.status !== 'excluded');
  const placed = placements.filter((p) => p.status === 'placed');
  const byRank = { 1: 0, 2: 0, 3: 0 };
  for (const p of placed) if (p.choiceRank) byRank[p.choiceRank] = (byRank[p.choiceRank] ?? 0) + 1;
  const inChoice = byRank[1] + byRank[2] + byRank[3];
  const total = considered.length || 1;

  const holders = considered.filter((p) => applicantsById.get(p.appId)?.accessibility);
  const inAccessibleBay = holders.filter(
    (p) => p.bayType === 'accessible' && (p.status === 'placed' || p.status === 'suggested'),
  ).length;
  const holderPending = holders.filter(
    (p) => p.flags.includes('NEEDS_DECISION') && !p.resolved,
  ).length;

  const openDecisions = placements.filter(
    (p) => (p.flags.includes('NEEDS_DECISION') || p.flags.includes('NO_LONGER_ON_CAMPUS')) && !p.resolved,
  ).length;

  const pools = Object.values(occupancy).flatMap((o) => Object.values(o));
  return {
    applicants: placements.length,
    considered: considered.length,
    excluded: placements.length - considered.length,
    placed: placed.length,
    suggested: placements.filter((p) => p.status === 'suggested').length,
    unplaced: placements.filter((p) => p.status === 'unplaced').length,
    waitlisted: placements.filter((p) => p.status === 'waitlisted').length,
    byChoiceRank: byRank,
    inChoicePct: inChoice / total,
    openDecisions,
    lotsOverCapacity: Object.entries(occupancy)
      .filter(([, o]) => Object.values(o).some((p) => p.over))
      .map(([id]) => id),
    lotsAtRisk: Object.entries(occupancy)
      .filter(([, o]) => Object.values(o).some((p) => p.risk))
      .map(([id]) => id),
    maxPeakPct: Math.max(0, ...pools.map((p) => (Number.isFinite(p.peakPct) ? p.peakPct : 0))),
    accessibility: {
      holders: holders.length,
      inAccessibleBay,
      pending: holderPending,
      ok: holderPending === 0 && holders.every((p) => p.status !== 'unplaced' || p.resolved),
    },
  };
}
