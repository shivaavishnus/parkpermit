# E3-S3 · Allocate general bays by rank and shift

[E3 · Allocation engine](../../README.md) · [PRD epic](../../../../../../../PRD.md#e3--allocation-engine-22-sp)

As the admin, general applicants are placed by priority with shift sharing.

**Story points** 8 · **UAT** 1, 2, 3, 5

## Acceptance criteria

- Choice-rank rounds (all first choices, then second, then third).
- Within a lot ordered by type rank, then distance, then id.
- BR-3 fit check.
- Night holders share bays with early/afternoon holders.
- Same input always gives the same output.

## Tasks

- [E3-S3-T1 · Verify preference rounds and tie-breakers](tasks/E3-S3-T1-verify-preference-rounds-and-tie-breakers.md)
- [E3-S3-T2 · Verify capacity across shifts](tasks/E3-S3-T2-verify-capacity-across-shifts.md)
- [E3-S3-T3 · Test deterministic allocation](tasks/E3-S3-T3-test-deterministic-allocation.md)
