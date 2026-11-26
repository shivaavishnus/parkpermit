---
name: ui-ux
description: Design, build or review ParkPermit's admin UI (React + Vite) — screens, components, layout, copy for reasons and flags, and WCAG 2.1 AA accessibility. Use when creating or changing a page or component in client/, writing UI text, or asked to "design", "improve the UX", "make it accessible" or "audit the UI".
---

# UI / UX for ParkPermit

One user: the **parking administrator**. They know the lots and rules, work at a desktop, and are
accountable for every permit. The UI must make a proposal **easy to check, easy to change and easy
to explain**. It is a work tool: dense and calm, not a marketing page.

Screens and flow are defined in `docs/APP_FLOW.md` (Login → Dashboard → Upload → Lot detail →
Decision list → Move dialog → Approve → Finalize, plus Audit). Read it before adding a screen.
Planned file names are in `docs/PROJECT_STRUCTURE.md` (`client/src/pages`, `client/src/components`).

## Design principles

1. **Proposal, not verdict.** Label engine output as "Proposed". Show `suggested` placements
   differently from `placed` (dashed outline plus the word "Suggested"). Nothing finalizes without an
   explicit admin action and a confirmation.
2. **Numbers with their limit.** Always show occupancy as `load / capacity` and a percentage
   (`12 / 13 · 92%`), per shift window (early 05–13, afternoon 13–21, night 21–05), per vehicle pool.
3. **Never colour alone** (CLAUDE.md, WCAG 1.4.1). Each status has colour, icon and text:
   OK (< 90%) ✓ "Within capacity"; Risk (≥ 90%) ⚠ "Near capacity"; Over (> 100%) ✕ "Over capacity".
   Bars carry a text label and an `aria-label`, e.g. "Early shift: 12 of 13 bays, 92%, near capacity".
4. **Decisions first.** The dashboard shows the open-decision count prominently. The decision list
   is sorted as in APP_FLOW: accessibility unmet → inactive → unplaced → suggested → over capacity.
5. **Explain everything.** Each row shows its one-sentence reason in full, not only in a tooltip,
   with a "Copy reason" button. Flags are chips with a text label and a short description on focus or hover.
6. **Safe moves.** In the Move dialog, show before/after bars for both source and target lots, live
   (< 500 ms, debounced). Blocking rules appear as an inline message that explains the rule, and
   the confirm button is disabled. Going over 100% requires an override-reason field. Accessible-bay
   violations have **no override UI at all**.
7. **Privacy by default.** Do not show the accessibility flag outside the accessibility panel and
   the applicant row (as "Accessible bay" for `bayType`). Never show medical wording. Names appear
   only where the admin needs to recognise someone; never sort or filter by name in a way that
   implies ranking.

## Copy rules

- Plain, neutral, second person in shareable reasons ("You were placed in Library Lot, your first
  choice…"). One sentence. Only that applicant's situation. Engine templates are in
  `server/src/engine/reasons.js`. The UI displays them and does not rewrite them.
- Flag labels: `NO_LONGER_ON_CAMPUS` → "No longer on campus"; `HOURS_VARIES` → "Hours vary
  (full day assumed)"; `SAME_LOT_ALL_CHOICES` → "Same lot for every choice"; `OVERCROWDING_RISK` →
  "Near capacity"; `NEEDS_DECISION` → "Needs your decision".
- Buttons are verbs: "Run allocation", "Move applicant", "Approve Library Lot", "Finalize term".
- Errors say what happened and what to do: "Row 14: pref_2 'LOT-Z' is not a lot in lots.csv. Fix
  the file and upload again."
- Use the same terms everywhere: _lot_, _bay_, _permit_, _shift window_, _general capacity_, _accessible bay_.

## Accessibility (WCAG 2.1 AA) checklist

- Semantic HTML first: `<table>` with `<th scope>` for applicant lists, `<button>` for actions,
  `<nav>`, `<main>`, one `<h1>` per page, headings in order.
- Every input has a visible `<label>`. Drop zones also have a normal file input.
- Contrast ≥ 4.5:1 for text and ≥ 3:1 for bar fills, borders and focus rings. Visible focus on every interactive element.
- Fully keyboard operable: the Move dialog traps focus, Esc closes it, and focus returns to the
  trigger. Tables sort with buttons in headers and `aria-sort`.
- Live updates: the move-preview results region uses `aria-live="polite"`; blocking errors use `role="alert"`.
- Charts: bars are `role="img"` with a full `aria-label`, or a visually hidden table of the same numbers.
- Works at 200% zoom and 1280 px width without horizontal page scroll (tables may scroll inside their container).
- Respect `prefers-reduced-motion`.

## Component patterns

| Component            | Must have                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `LotCard`            | Lot name; permits car/bike; worst-window peak as text + icon; accessibility ✓ or "Needs attention" as text; approval state; link to the lot |
| `OccupancyBars`      | Three windows per pool, capacity marker, `load / cap · %` labels, status word                                                               |
| `AccessibilityPanel` | Accessible bays used / total per pool; holders placed vs pending. No names on the dashboard                                                 |
| `ApplicantTable`     | id, type, shift, choice rank, status, flags, reason, actions; search and filter; sticky header                                              |
| `FlagChip`           | Icon + text label + description; not colour-only                                                                                            |
| `MoveDialog`         | Target picker (chosen lots first, with distance); before/after bars; rule messages; override reason when required                           |
| `ValidationReport`   | Errors (blocking) vs warnings, row numbers, counts of known data issues; `past_peak_count` labelled "includes visitors and contractors"     |

## Build workflow

1. Check the story's acceptance criteria in `docs/PRD.md`, and the screen in `docs/APP_FLOW.md`.
2. Build with plain React, CSS modules or `client/src/styles`, and TanStack Query for server state.
   Show loading, empty and error states for every data view.
3. Write Testing Library tests that query by role and name (see the `write-tests` skill).
4. Run the checklist above. For a full audit, the `design:accessibility-review` skill can be used as well.

## Review output

When auditing, list issues by screen with the WCAG criterion or principle number, the severity
(blocker / should fix / polish), and a concrete fix.
