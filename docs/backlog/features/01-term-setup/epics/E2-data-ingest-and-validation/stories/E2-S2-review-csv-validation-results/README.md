# E2-S2 · Review CSV validation results

[E2 · Data ingest and validation](../../README.md) · [PRD epic](../../../../../../../PRD.md#e2--data-ingest-and-validation-11-sp)

As the admin, I see a validation report before allocating.

**Story points** 3 · **UAT** —

## Acceptance criteria

- Row-level errors (missing id, unknown lot, bad enum) listed with row number.
- Blocking errors stop allocation.
- Warnings do not.

## Tasks

- [E2-S2-T1 · Report errors with row numbers](tasks/E2-S2-T1-report-errors-with-row-numbers.md)
- [E2-S2-T2 · Gate allocation on blocking errors](tasks/E2-S2-T2-gate-allocation-on-blocking-errors.md)
- [E2-S2-T3 · Show the validation report](tasks/E2-S2-T3-show-the-validation-report.md)
