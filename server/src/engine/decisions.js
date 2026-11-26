import { computeOccupancy } from './occupancy.js';
import { findViolations, RuleViolation } from './checks.js';
import { summarise } from './summary.js';
import { cleanNote, shiftLabel } from './reasons.js';

export const DECISION_ACTIONS = Object.freeze([
  'accept_suggestion',
  'waitlist',
  'confirm_exclusion',
  'reinstate',
]);

/**
 * Resolve an item on the decision list. Pure: returns new placements plus an optional
 * applicant patch (reinstate sets active=true) for the caller to persist.
 */
export function resolveDecision({ lots, placements, applicantsById, config, appId, action, note }) {
  const cleaned = cleanNote(note);
  if (!cleaned) throw new RuleViolation(['A note is required for every decision.']);
  if (!DECISION_ACTIONS.includes(action)) throw new RuleViolation([`Unknown action ${action}.`]);
  const p = placements.find((x) => x.appId === appId);
  const a = applicantsById.get(appId);
  if (!p || !a) throw new RuleViolation([`${appId}: not found`]);
  const lotName = (id) => lots.find((l) => l.lotId === id)?.name ?? id;
  const decision = { action, note: cleaned };
  let next;
  let applicantPatch = null;

  switch (action) {
    case 'accept_suggestion':
      if (p.status !== 'suggested') throw new RuleViolation(['Only suggestions can be accepted.']);
      next = {
        ...p,
        status: 'placed',
        resolved: true,
        byAdmin: true,
        decision,
        reason:
          p.bayType === 'accessible'
            ? `Placed in an accessible bay at ${lotName(p.lotId)}, proposed because your chosen lots had none free, and confirmed by the parking administrator.`
            : `Placed in ${lotName(p.lotId)}, proposed because none of your chosen lots had space for ${shiftLabel(a.shift, config)} hours, and confirmed by the parking administrator.`,
      };
      break;
    case 'waitlist':
      if (p.status === 'excluded') throw new RuleViolation(['Reinstate before waitlisting.']);
      next = {
        ...p,
        status: 'waitlisted',
        lotId: null,
        bayType: 'none',
        choiceRank: null,
        resolved: true,
        byAdmin: true,
        decision,
        reason: `Held on the waiting list by the parking administrator: ${cleaned}.`,
      };
      break;
    case 'confirm_exclusion':
      if (p.status !== 'excluded') throw new RuleViolation(['Applicant is not excluded.']);
      next = { ...p, resolved: true, byAdmin: true, decision };
      break;
    case 'reinstate':
      if (p.status !== 'excluded') throw new RuleViolation(['Applicant is not excluded.']);
      applicantPatch = { active: true };
      next = {
        ...p,
        status: 'unplaced',
        resolved: false,
        byAdmin: true,
        decision,
        flags: p.flags.includes('NEEDS_DECISION') ? p.flags : [...p.flags, 'NEEDS_DECISION'],
        reason: 'Reinstated by the parking administrator and awaiting placement.',
      };
      break;
  }

  const placementsNext = placements.map((x) => (x.appId === appId ? next : x));
  const byId = applicantPatch
    ? new Map([...applicantsById, [appId, { ...a, ...applicantPatch }]])
    : applicantsById;
  const occupancy = computeOccupancy({ lots, placements: placementsNext, applicantsById: byId, config });
  const violations = findViolations({ lots, placements: placementsNext, applicantsById: byId, occupancy });
  if (violations.length) throw new RuleViolation(violations);
  return {
    placements: placementsNext,
    occupancy,
    summary: summarise({ placements: placementsNext, applicantsById: byId, occupancy }),
    applicantPatch,
  };
}
