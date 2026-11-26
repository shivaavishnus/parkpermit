/** Five blocks on a campus spine; walking distance lot -> block in metres. */
export const BLOCKS = ['A', 'B', 'C', 'D', 'E'];
const POSITION = { A: 0, B: 250, C: 500, D: 800, E: 1100 };
const NAMES = {
  A: 'Library Lot',
  B: 'Science Lot',
  C: 'Arts Lot',
  D: 'Sports Lot',
  E: 'East Lot',
};
/** Historic peak counts as recorded by the gate - they include visitors and contractors. */
const PAST_PEAK = { A: 31, B: 19, C: 16, D: 12, E: 9 };

export function buildLots() {
  return BLOCKS.map((b) => ({
    lot_id: `LOT-${b}`,
    name: NAMES[b],
    block: b,
    car_total: 25,
    car_accessible: 2,
    car_visitor: 5,
    car_reserved: 5,
    bike_total: 25,
    bike_accessible: 2,
    bike_visitor: 5,
    bike_reserved: 0,
    ...Object.fromEntries(BLOCKS.map((t) => [`dist_${t}`, Math.abs(POSITION[b] - POSITION[t]) + 80])),
    past_peak_count: PAST_PEAK[b],
  }));
}
