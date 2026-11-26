/** Deterministic string comparison (not locale dependent). */
export function compareIds(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Distance from a lot to an applicant's home block; unknown distances sort last. */
export function distanceTo(lot, homeBlock) {
  const d = lot.distances?.[homeBlock];
  return Number.isFinite(d) ? d : Number.POSITIVE_INFINITY;
}

/**
 * Priority comparator for competing applicants at one lot:
 * campus type rank, then distance from the lot to home block, then application id.
 */
export function priorityComparator(lot, config) {
  return (a, b) =>
    config.typeRank[a.type] - config.typeRank[b.type] ||
    distanceTo(lot, a.homeBlock) - distanceTo(lot, b.homeBlock) ||
    compareIds(a.appId, b.appId);
}

/** Order used where no single lot applies (fallback): type rank, then id. */
export function groupComparator(config) {
  return (a, b) => config.typeRank[a.type] - config.typeRank[b.type] || compareIds(a.appId, b.appId);
}

/** Lots ordered by distance to a home block, tie-broken by lot id. */
export function lotsByDistance(lots, homeBlock) {
  return [...lots].sort(
    (a, b) => distanceTo(a, homeBlock) - distanceTo(b, homeBlock) || compareIds(a.lotId, b.lotId),
  );
}
