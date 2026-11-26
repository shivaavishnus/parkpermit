/**
 * Shared JSDoc types for the allocation engine. No runtime code.
 *
 * @typedef {'early'|'afternoon'|'night'} Window
 * @typedef {'early'|'afternoon'|'night'|'varies'} Shift
 * @typedef {'car'|'bike'} Vehicle
 * @typedef {'staff'|'faculty'|'contractor'|'student'} ApplicantType
 * @typedef {'placed'|'suggested'|'unplaced'|'excluded'|'waitlisted'} PlacementStatus
 * @typedef {'accessible'|'general'|'none'} BayType
 * @typedef {'NO_LONGER_ON_CAMPUS'|'HOURS_VARIES'|'SAME_LOT_ALL_CHOICES'|'NEEDS_DECISION'} ApplicantFlag
 *
 * @typedef {{ total: number, accessible: number, visitor: number, reserved: number }} PoolSpec
 * @typedef {{ lotId: string, name: string, block: string, car: PoolSpec, bike: PoolSpec,
 *             distances: Record<string, number>, pastPeakCount?: number|null }} Lot
 *
 * Normalised applicant. `name` may be present but the engine never reads it.
 * @typedef {{ appId: string, type: ApplicantType, homeBlock: string, vehicle: Vehicle,
 *             shift: Shift, windows: Window[], prefs: string[], accessibility: boolean,
 *             active: boolean, dataFlags: ApplicantFlag[] }} Applicant
 *
 * @typedef {{ lotId: string, rank: number, cause: string, reason: string }} UnmetChoice
 * @typedef {{ appId: string, lotId: string|null, bayType: BayType, status: PlacementStatus,
 *             choiceRank: number|null, flags: ApplicantFlag[], reason: string,
 *             unmet: UnmetChoice[], resolved: boolean, byAdmin: boolean,
 *             decision: null|{ action: string, note: string } }} Placement
 *
 * @typedef {{ generalCap: number, accessibleCap: number, load: Record<Window, number>,
 *             accessibleUsed: number, permits: number, peak: number, peakPct: number,
 *             risk: boolean, over: boolean, shared: boolean }} Pool
 * @typedef {Record<string, { car: Pool, bike: Pool }>} Occupancy
 */
export {};
