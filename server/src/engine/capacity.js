/** @typedef {import('./types.js').PoolSpec} PoolSpec */

/** General capacity = total - accessible - visitor - reserved (never below zero). */
export function poolCapacity(spec) {
  const general = spec.total - spec.accessible - spec.visitor - spec.reserved;
  return { generalCap: Math.max(0, general), accessibleCap: Math.max(0, spec.accessible) };
}

function emptyPool(spec, config) {
  const { generalCap, accessibleCap } = poolCapacity(spec);
  const load = Object.fromEntries(config.windows.map((w) => [w, 0]));
  return { generalCap, accessibleCap, load, accessibleUsed: 0, members: [] };
}

/** Mutable working state used while allocating: one pool per lot and vehicle. */
export function buildCapacity(lots, config) {
  return Object.fromEntries(
    lots.map((lot) => [
      lot.lotId,
      { car: emptyPool(lot.car, config), bike: emptyPool(lot.bike, config) },
    ]),
  );
}
