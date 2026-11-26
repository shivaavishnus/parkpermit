# E3-S2 · Allocate accessible bays first

[E3 · Allocation engine](../../README.md) · [PRD epic](../../../../../../../PRD.md#e3--allocation-engine-22-sp)

As the admin, accessibility holders are placed first, in accessible bays only.

**Story points** 5 · **UAT** 4

## Acceptance criteria

- Holders placed in choice order, then nearest lot with a free accessible bay.
- Never placed in a general bay automatically.
- If no accessible bay exists → `NEEDS_DECISION`.
- Accessible occupancy never exceeds 100%.

## Tasks

- [E3-S2-T1 · Allocate accessible bays by preference](tasks/E3-S2-T1-allocate-accessible-bays-by-preference.md)
- [E3-S2-T2 · Handle unavailable accessible bays](tasks/E3-S2-T2-handle-unavailable-accessible-bays.md)
- [E3-S2-T3 · Verify accessible-bay invariants](tasks/E3-S2-T3-verify-accessible-bay-invariants.md)
