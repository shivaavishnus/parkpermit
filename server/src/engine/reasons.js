/**
 * One-sentence, shareable reasons. A reason mentions only the applicant's own lot,
 * choice rank, priority group and hours - never another person.
 */
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth'];
export const ordinal = (n) => ORDINAL[n - 1] ?? `${n}th`;

export function shiftLabel(shift, config) {
  if (shift === 'varies') return 'full-day';
  return `${shift} (${config.windowHours[shift]})`;
}

export const UNMET_CAUSE = Object.freeze({
  EARLIER_CHOICE: 'EARLIER_CHOICE',
  HIGHER_PRIORITY: 'HIGHER_PRIORITY',
  SAME_GROUP_CLOSER: 'SAME_GROUP_CLOSER',
  NO_CAPACITY: 'NO_CAPACITY',
  ACCESSIBLE_FULL: 'ACCESSIBLE_FULL',
});

export function unmetReason({ lotName, rank, cause, shift, vehicle }, config) {
  const head = `${lotName} (your ${ordinal(rank)} choice)`;
  const hours = shiftLabel(shift, config);
  switch (cause) {
    case UNMET_CAUSE.ACCESSIBLE_FULL:
      return `${head} had no free accessible bay for a ${vehicle}.`;
    case UNMET_CAUSE.NO_CAPACITY:
      return `${head} has no general ${vehicle} bays available for permits.`;
    case UNMET_CAUSE.EARLIER_CHOICE:
      return `${head} was full for ${hours} hours with applicants who listed it as an earlier choice.`;
    case UNMET_CAUSE.HIGHER_PRIORITY:
      return `${head} was full for ${hours} hours with applicants in a higher campus priority group.`;
    default:
      return `${head} was full for ${hours} hours with applicants in the same priority group ranked ahead by distance to the lot.`;
  }
}

function suffixes(applicant, lotNameOf) {
  const parts = [];
  if (applicant.dataFlags.includes('HOURS_VARIES'))
    parts.push(`hours listed as "varies" were treated as full day`);
  if (applicant.dataFlags.includes('SAME_LOT_ALL_CHOICES') && applicant.prefs[0])
    parts.push(`you listed ${lotNameOf(applicant.prefs[0])} for every choice`);
  return parts;
}

function sentence(main, extras) {
  return `${[main, ...extras].join('; ')}.`;
}

/** Reason for an engine-generated outcome. */
export function placementReason({ placement, applicant, lotNameOf, pool, config }) {
  const hours = shiftLabel(applicant.shift, config);
  const lot = placement.lotId ? lotNameOf(placement.lotId) : null;
  const extras = suffixes(applicant, lotNameOf);
  const firstUnmet = placement.unmet[0];

  switch (placement.status) {
    case 'excluded':
      return 'Not allocated because records show you are no longer on campus; contact parking services if this is wrong.';
    case 'unplaced':
      return sentence(
        applicant.accessibility
          ? 'No accessible bay was free in any lot, so your application is held for an administrator decision'
          : `No lot had space for ${hours} hours, so your application is held for an administrator decision`,
        extras,
      );
    case 'suggested':
      return sentence(
        placement.bayType === 'accessible'
          ? `Your chosen lots had no free accessible bay, so an accessible bay at ${lot}, the nearest available, is proposed pending administrator review`
          : `None of your chosen lots had space for ${hours} hours, so ${lot}, the nearest lot to your home block with space, is proposed pending administrator review`,
        extras,
      );
    case 'placed': {
      if (placement.bayType === 'accessible') {
        return sentence(
          `Placed in an accessible bay at ${lot}, your ${ordinal(placement.choiceRank)} choice, under campus accessibility policy`,
          extras,
        );
      }
      const shared = pool?.shared && applicant.windows.length === 1;
      let main;
      if (placement.choiceRank === 1) {
        main = shared
          ? `Placed in ${lot}, your first choice, where your ${hours} hours share bays with people on other shifts`
          : `Placed in ${lot}, your first choice, which has space for ${hours} hours`;
      } else {
        main = `Placed in ${lot}, your ${ordinal(placement.choiceRank)} choice, because ${lotNameOf(firstUnmet.lotId)} had no space left for ${hours} hours`;
        if (shared) main += `, and your hours share bays with people on other shifts`;
      }
      return sentence(main, extras);
    }
    default:
      return 'Held on the waiting list by the parking administrator.';
  }
}

/** Single-line admin note, trimmed and length limited. */
export function cleanNote(note) {
  return String(note ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
    .replace(/[.\s]+$/, '');
}
