# E6-S2 · Validate and save a move

[E6 · Move with live checks](../../README.md) · [PRD epic](../../../../../../../PRD.md#e6--move-with-live-checks-10-sp)

As the admin, rule-breaking moves are blocked or need a reason.

**Story points** 3 · **UAT** 4

## Acceptance criteria

- Moving a non-holder into an accessible bay, or exceeding accessible bays, is blocked with an explanation.
- Exceeding general capacity requires an override reason.
- Moving an approved lot's applicant reopens that lot's approval.

## Tasks

- [E6-S2-T1 · Enforce accessible-bay rules on save](tasks/E6-S2-T1-enforce-accessible-bay-rules-on-save.md)
- [E6-S2-T2 · Require a general-capacity override reason](tasks/E6-S2-T2-require-a-general-capacity-override-reason.md)
- [E6-S2-T3 · Persist the move and reopen approval](tasks/E6-S2-T3-persist-the-move-and-reopen-approval.md)
