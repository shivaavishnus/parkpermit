/**
 * Business configuration for the allocation engine.
 * Copied into every Allocation as `configSnapshot` so results can be reproduced.
 */
export const allocationConfig = Object.freeze({
  windows: ['early', 'afternoon', 'night'],
  windowHours: { early: '05:00-13:00', afternoon: '13:00-21:00', night: '21:00-05:00' },
  shiftWindows: {
    early: ['early'],
    afternoon: ['afternoon'],
    night: ['night'],
    varies: ['early', 'afternoon', 'night'],
  },
  /** Lower rank = higher priority. */
  typeRank: { staff: 0, faculty: 1, contractor: 2, student: 3 },
  /** Lot pool at or above this share of general capacity in any window is OVERCROWDING_RISK. */
  riskThreshold: 0.9,
  maxChoices: 3,
});
