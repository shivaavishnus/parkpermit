---
name: write-user-stories
description: Write, split, refine or estimate ParkPermit user stories in docs/PRD.md — "As the admin…" stories with testable acceptance criteria, Fibonacci story points, epic and UAT-1..7 mapping, checked against the project's fixed rules and scope. Use when adding a feature or epic, turning feedback into backlog items, or asked to "write stories", "add acceptance criteria" or "estimate".
---

# Write user stories

The backlog lives in `docs/PRD.md` §7 as one table per epic (E1–E9). Business rules are in §6
(BR-1…BR-11), and the UAT mapping is in §8. Stories must fit the fixed decisions in §4 and the
scope in §5.

## Format (match the PRD tables exactly)

```
| ID | Story | Acceptance criteria | SP | UAT |
|---|---|---|---|---|
| E5-S3 | As the admin, I <capability> so that <benefit>. | <criterion>; <criterion>; <criterion>. | 3 | 6 |
```

- **ID**: `E<epic>-S<n>`, continuing the epic's numbering. Never renumber existing stories, since branches use the IDs.
- **Story**: the only user is **the admin**. Team or tooling stories use "As the team".
- **Acceptance criteria**: 3–6 criteria separated by `;`. Each must be observable and testable,
  with numbers where possible (`within 500 ms`, `≥ 90%`, `row number shown`). Cover the unhappy
  path, the audit-log entry if data changes, and the rule that blocks misuse. Cite the BR-n the story relies on.
- **SP**: Fibonacci 1, 2, 3, 5, 8, 13. Anything rated 13 must be split. Reference points: E1-S2
  (401 on protected routes) = 2; E2-S1 (upload + schema check) = 5; E3-S3 (general pass with shift sharing) = 8.
- **UAT**: the UAT-1..7 numbers the story helps prove, `all`, or `—`.

## Checks before adding a story

1. **In scope?** Out of scope: issuing permits, payments, enforcement, gate or camera, real-time
   shift tracking, applicant self-service, notifications, multi-campus, extra roles. If the request
   is out of scope, say so and put it in §10 "Assumptions and open questions" instead.
2. **Respects the non-negotiables?** (CLAUDE.md) Reject or reshape anything that would: let
   non-holders use accessible bays or add an override for them; use the accessibility flag for
   anything except choosing an accessible bay; read names or other personal characteristics in
   placement; auto-approve or auto-finalize; produce a reason that mentions other people; or use real data.
3. **INVEST**: independent where possible, valuable to the admin, small enough for ≤ 2 days
   (≤ 5 SP is typical), and testable. Split by workflow step, by rule, or by happy path vs error
   path, not by layer (API vs UI).
4. **Traceable**: every UAT-1..7 case must still be covered by at least one story. Every new rule
   needs a BR-n row in §6, and an engine story needs tests named after it.

## Workflow

1. Read `docs/PRD.md` §4–§8 and the relevant parts of `docs/APP_FLOW.md` and `docs/ARCHITECTURE.md`.
2. Draft the stories. Show them to the user as a table with a one-line rationale for each estimate.
3. After the user agrees, edit `docs/PRD.md`:
   - add the rows to the right epic table and update the epic's SP total in its heading;
   - update **Total** and the cut-order line below the epics if priorities changed;
   - add BR rows, UAT rows or open questions if needed.
4. If the story changes behaviour, list the docs that also need updating (ARCHITECTURE §5 for
   engine rules, APP_FLOW for screens, CICD for checks) and update them in the same change.
5. Give the branch name to use: `feat/E<n>-S<n>-<slug>`.

## Example

| ID    | Story                                                                                                    | Acceptance criteria                                                                                                                                                                                        | SP  | UAT     |
| ----- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------- |
| E5-S3 | As the admin, I can filter the decision list by lot and flag so I can clear one lot before approving it. | Filters for lot (A–E) and each flag, combinable; count updates with filters; filter state kept in the URL; empty state says "No open decisions for this filter"; keyboard operable with labelled controls. | 2   | 2, 6, 7 |
