# E2-S3 · Normalize known data issues

[E2 · Data ingest and validation](../../README.md) · [PRD epic](../../../../../../../PRD.md#e2--data-ingest-and-validation-11-sp)

As the admin, known data issues are normalised and flagged, not silently fixed.

**Story points** 3 · **UAT** 5, 6, 7

## Acceptance criteria

- `varies` mapped to full day and flagged `HOURS_VARIES`.
- Duplicate choices collapsed and `SAME_LOT_ALL_CHOICES` flagged.
- `active=no` excluded and flagged `NO_LONGER_ON_CAMPUS`.
- `past_peak_count` stored as context only.

## Tasks

- [E2-S3-T1 · Normalize shifts and lot choices](tasks/E2-S3-T1-normalize-shifts-and-lot-choices.md)
- [E2-S3-T2 · Flag inactive applicants](tasks/E2-S3-T2-flag-inactive-applicants.md)
- [E2-S3-T3 · Keep historic occupancy contextual](tasks/E2-S3-T3-keep-historic-occupancy-contextual.md)
