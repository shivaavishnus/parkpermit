import { computeOccupancy } from './occupancy.js';
import { findViolations, RuleViolation } from './checks.js';
import { summarise } from './summary.js';
import { cleanNote } from './reasons.js';

const occupying = (p) => p.status === 'placed' || p.status === 'suggested';
const pick = (occ, lotId, vehicle) => (lotId && occ[lotId] ? occ[lotId][vehicle] : null);

/**
 * Live check for moving one applicant to a target lot. No side effects.
 * @param {{ lots: any[], placements: any[], applicantsById: Map<string, any>, config: any,
 *           appId: string, targetLotId: string, bayType?: 'accessible'|'general' }} input
 */
export function previewMove({ lots, placements, applicantsById, config, appId, targetLotId, bayType }) {
  const blocking = [];
  const warnings = [];
  const current = placements.find((p) => p.appId === appId);
  const applicant = applicantsById.get(appId);
  if (!current || !applicant) throw new RuleViolation([`${appId}: not found`]);
  const lotById = new Map(lots.map((l) => [l.lotId, l]));
  const target = lotById.get(targetLotId);
  const occBefore = computeOccupancy({ lots, placements, applicantsById, config });

  if (!target) blocking.push(`Lot ${targetLotId} does not exist.`);
  if (current.status === 'excluded' || !applicant.active)
    blocking.push('This applicant is recorded as no longer on campus; reinstate them first.');
  if (target && occupying(current) && current.lotId === targetLotId)
    blocking.push(`Already in ${target.name}.`);

  // Choose the bay type. Accessible bays: holders only, never oversold, no override.
  let chosenBay = bayType ?? (applicant.accessibility ? 'accessible' : 'general');
  if (chosenBay === 'accessible' && !applicant.accessibility) {
    blocking.push('Accessible bays are only for accessibility permit holders.');
  }
  if (target && chosenBay === 'accessible' && applicant.accessibility) {
    const pool = occBefore[targetLotId][applicant.vehicle];
    const selfThere =
      occupying(current) && current.lotId === targetLotId && current.bayType === 'accessible';
    if (pool.accessibleUsed - (selfThere ? 1 : 0) >= pool.accessibleCap) {
      if (bayType === 'accessible') {
        blocking.push(`No free accessible ${applicant.vehicle} bay at ${target.name}.`);
      } else {
        chosenBay = 'general';
        warnings.push(
          `No free accessible ${applicant.vehicle} bay at ${target.name}; this holder would use a general bay.`,
        );
      }
    }
  }
  if (target && chosenBay === 'general' && applicant.accessibility && bayType === 'general') {
    warnings.push('This accessibility permit holder would use a general bay.');
  }

  const rank = applicant.prefs.indexOf(targetLotId);
  if (target && rank === -1) warnings.push(`${target.name} is not one of this applicant's choices.`);

  const next = {
    ...current,
    lotId: targetLotId,
    bayType: chosenBay,
    status: 'placed',
    choiceRank: rank === -1 ? null : rank + 1,
  };
  const nextPlacements = placements.map((p) => (p.appId === appId ? next : p));
  const occAfter = target
    ? computeOccupancy({ lots, placements: nextPlacements, applicantsById, config })
    : occBefore;

  let requiresOverride = false;
  const targetAfter = pick(occAfter, targetLotId, applicant.vehicle);
  if (target && targetAfter) {
    if (targetAfter.over) {
      requiresOverride = true;
      warnings.push(
        `${target.name} would exceed 100% of general ${applicant.vehicle} capacity (peak ${targetAfter.peak}/${targetAfter.generalCap}); an override reason is required.`,
      );
    } else if (targetAfter.risk) {
      warnings.push(
        `${target.name} would be at ${Math.round(targetAfter.peakPct * 100)}% of general ${applicant.vehicle} capacity at peak.`,
      );
    }
  }
  if (target && !blocking.length) {
    const violations = findViolations({
      lots,
      placements: nextPlacements.map((p) => (p.appId === appId ? { ...p, reason: 'pending' } : p)),
      applicantsById,
      occupancy: occAfter,
    });
    blocking.push(...violations);
  }

  const sourceLotId = occupying(current) ? current.lotId : null;
  return {
    appId,
    allowed: blocking.length === 0,
    requiresOverride,
    blocking,
    warnings,
    bayType: chosenBay,
    choiceRank: next.choiceRank,
    source: sourceLotId
      ? {
          lotId: sourceLotId,
          before: pick(occBefore, sourceLotId, applicant.vehicle),
          after: pick(occAfter, sourceLotId, applicant.vehicle),
        }
      : null,
    target: target
      ? {
          lotId: targetLotId,
          before: pick(occBefore, targetLotId, applicant.vehicle),
          after: targetAfter,
        }
      : null,
    _next: { placements: nextPlacements, occupancy: occAfter },
  };
}

/** Commit a move. Throws RuleViolation if blocked or if an override reason is missing. */
export function applyMove(input) {
  const { note, overrideReason, lots, applicantsById } = input;
  const cleaned = cleanNote(note);
  if (!cleaned) throw new RuleViolation(['A note is required for every move.']);
  const preview = previewMove(input);
  if (!preview.allowed) throw new RuleViolation(preview.blocking);
  const override = cleanNote(overrideReason);
  if (preview.requiresOverride && !override)
    throw new RuleViolation(['Override reason required: target lot would exceed capacity.']);

  const lotName = lots.find((l) => l.lotId === preview.target.lotId).name;
  const placements = preview._next.placements.map((p) =>
    p.appId === input.appId
      ? {
          ...p,
          byAdmin: true,
          resolved: true,
          decision: { action: 'move', note: cleaned, overrideReason: override || null },
          reason:
            p.bayType === 'accessible'
              ? `Placed in an accessible bay at ${lotName} by the parking administrator: ${cleaned}.`
              : `Placed in ${lotName} by the parking administrator: ${cleaned}.`,
        }
      : p,
  );
  const occupancy = preview._next.occupancy;
  const violations = findViolations({ lots, placements, applicantsById, occupancy });
  if (violations.length) throw new RuleViolation(violations);
  const publicPreview = { ...preview };
  delete publicPreview._next;
  return {
    placements,
    occupancy,
    summary: summarise({ placements, applicantsById, occupancy }),
    preview: publicPreview,
  };
}

/** Put one placement back to a previous state (undo). Rules are re-checked. */
export function restorePlacement({ lots, placements, applicantsById, config, previous }) {
  const next = placements.map((p) => (p.appId === previous.appId ? previous : p));
  const occupancy = computeOccupancy({ lots, placements: next, applicantsById, config });
  const violations = findViolations({ lots, placements: next, applicantsById, occupancy });
  if (violations.length) throw new RuleViolation(violations);
  return {
    placements: next,
    occupancy,
    summary: summarise({ placements: next, applicantsById, occupancy }),
  };
}
