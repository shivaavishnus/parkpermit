/** Fictional name parts. Combinations are synthetic and not meant to match real people. */
export const FIRST = [
  'Avery', 'Blake', 'Casey', 'Devon', 'Emery', 'Finley', 'Harper', 'Jordan',
  'Kai', 'Logan', 'Morgan', 'Quinn', 'Riley', 'Rowan', 'Sage', 'Taylor',
];
export const LAST = [
  'Ashford', 'Brookvale', 'Calloway', 'Dunmore', 'Ellery', 'Fairbank', 'Greaves', 'Hollis',
  'Ivers', 'Kestrel', 'Lindqvane', 'Marlow', 'Northcott', 'Oakes', 'Pendle', 'Quarrington',
];
export const nameFor = (i) =>
  `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`;
