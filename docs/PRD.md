# ParkPermit — Product Requirements (MVP)

| | |
|---|---|
| Status | Draft for approval |
| Timebox | 2 weeks (one sprint) |
| Source | [BRIEF.md](BRIEF.md) |
| Data | Synthetic only |

## 1. Problem
Each semester the parking administrator hand-allocates hundreds of permit applications across five lots. Lots have fixed bays, some held back for accessibility, visitors and special staff, and applicants work very different hours. Issue too many permits and people circle for spaces; too few and bays sit empty. Missing an accessibility need is unfair and a compliance breach. Today the admin works from spreadsheets, cannot easily see whether shift sharing keeps a lot within capacity, and struggles to explain decisions.

## 2. User
**Parking administrator** (single role, login required). Knows the lots and campus rules and is accountable for every permit. Wants a defensible proposal they can adjust, not a black box.

Applicants do not use the system in the MVP. They see only the one-sentence reason the admin chooses to share.

## 3. Goals and success measures
| Measure | How the MVP shows it | Target for UAT |
|---|---|---|
| Less admin time per term | Time from upload to finalized term (from the audit log) | Synthetic term reviewed and finalized in under 1 hour |
| Applicants placed in a lot they chose | Dashboard KPI: % placed in choice 1 / 2 / 3 | Reported for every run; ≥ 85% on synthetic data |
| Peak occupancy within safe limits | Per-lot, per-shift peak vs general capacity | Every lot ≤ 100% on approval (hard check) |
| Accessibility honored in every case | Accessibility panel: holders vs accessible bays | 100% placed in an accessible bay, or an open decision |
| Admin confidence in reasons | Reason on every placement and every unmet choice | 100% coverage; admin rates reasons in UAT sign-off |

## 4. Fixed decisions
- **Users:** admin only, login required.
- **Inputs:** two CSVs per term, `applications.csv` and `lots.csv` (schemas in [ARCHITECTURE.md](ARCHITECTURE.md#4-data-model)).
- **Term:** one semester (6 months).
- **Lots:** 5 blocks, one lot each. Per lot: 25 car + 25 bike bays; each vehicle pool has 2 accessible and 5 visitor bays; 5 car bays are reserved for special staff (dean, VP).
- **Shift sharing:** a general bay may be shared by holders whose shifts do not overlap. For every shift window, expected peak occupancy must be ≤ 100% of general capacity. `varies` counts as full day (all windows).
- **Priority:** (1) accessibility permit holders, into accessible bays only; (2) staff > faculty > contractor > student; (3) tie-break by distance from lot to the applicant's home block; (4) final tie-break by application id, so results are deterministic.
- **Reasons:** every placement and every unmet choice gets a one-sentence, shareable reason.
- **Flags:** `NO_LONGER_ON_CAMPUS`, `HOURS_VARIES`, `SAME_LOT_ALL_CHOICES`, `OVERCROWDING_RISK`, `NEEDS_DECISION`.
- **Admin control:** the engine only proposes. The admin can move any applicant and approves each lot; nothing is final until the term is finalized.

## 5. Scope
**In scope**
- Admin login and logout
- CSV upload with validation and a data-issue report
- Deterministic allocation engine (accessibility, priority, shift sharing, fallback suggestions)
- Per-lot view: permits issued, peak occupancy per shift and vehicle pool, accessibility confirmation
- Decision list of flagged applicants
- Move an applicant, with occupancy checks that update live before saving
- Approve per lot, finalize term, export allocation CSV with reasons
- Audit log of moves, overrides, approvals
- Synthetic data generator covering UAT-1..7

**Out of scope**
Issuing physical or digital permits, payments, enforcement, gate or camera integration, real-time shift tracking, applicant self-service portal, notifications and email, multi-campus, multiple admin roles.

## 6. Business rules
| ID | Rule |
|---|---|
| BR-1 | General capacity per lot and vehicle = total − accessible − visitor − reserved. Default car: 25 − 2 − 5 − 5 = **13**; bike: 25 − 2 − 5 − 0 = **18**. Values come from `lots.csv`, not code. |
| BR-2 | Shift windows: `early` 05:00–13:00, `afternoon` 13:00–21:00, `night` 21:00–05:00. `varies` occupies all three. |
| BR-3 | A placement fits a lot if, for every window the shift covers, `load + 1 ≤ general capacity`. |
| BR-4 | Accessibility holders are placed only in accessible bays of their vehicle type, one holder per bay. Accessible bays are never shift-shared, oversold or given to non-holders, and the admin cannot override this. |
| BR-5 | The accessibility flag is used only to choose an accessible bay. It is not used for ranking, reporting beyond the accessibility panel, or reasons beyond "accessible bay per campus policy". No medical detail is stored. |
| BR-6 | Inactive applicants (`active_on_campus = no`) are not allocated. They are flagged `NO_LONGER_ON_CAMPUS` so the admin can confirm or reinstate. |
| BR-7 | Duplicate lot choices are collapsed. If all choices are the same lot, flag `SAME_LOT_ALL_CHOICES`. |
| BR-8 | `OVERCROWDING_RISK` when any window of a lot is ≥ 90% of general capacity (configurable). A lot over 100% cannot be approved unless the admin records an override reason. |
| BR-9 | If no chosen lot fits, the engine suggests the nearest lot to the home block that fits, marks it `suggested`, and flags `NEEDS_DECISION`. If no lot fits, the applicant is `unplaced` with `NEEDS_DECISION`. |
| BR-10 | Ranking uses only type, lot choices, home block distance and id. No name, gender, age or other personal attribute is read by the engine. |
| BR-11 | Historic occupancy (optional `past_peak_count` in `lots.csv`) is shown for context only, labeled "includes visitors and contractors", and never used in capacity math. |

## 7. Epics, user stories and acceptance criteria
Story points use the Fibonacci scale (1, 2, 3, 5, 8, 13).

### E1 — Authentication and app shell (5 SP)
| ID | Story | Acceptance criteria | SP | UAT |
|---|---|---|---|---|
| E1-S1 | As the admin, I log in so only I can see applicant data. | Valid credentials open the dashboard; invalid credentials show a generic error; session is an httpOnly cookie; 5 failed attempts in 15 min are rate-limited. | 3 | — |
| E1-S2 | As the admin, protected pages and APIs reject me after logout or expiry. | Every `/api` route except login returns 401 without a valid session; the UI redirects to login. | 2 | — |

### E2 — Data ingest and validation (11 SP)
| ID | Story | Acceptance criteria | SP | UAT |
|---|---|---|---|---|
| E2-S1 | As the admin, I upload `applications.csv` and `lots.csv` for a term. | Both files required; header schema checked; parse result shows row counts; re-upload replaces the term's data and clears the proposal after confirmation. | 5 | all |
| E2-S2 | As the admin, I see a validation report before allocating. | Row-level errors (missing id, unknown lot, bad enum) listed with row number; blocking errors stop allocation; warnings do not. | 3 | — |
| E2-S3 | As the admin, known data issues are normalised and flagged, not silently fixed. | `varies` mapped to full day and flagged `HOURS_VARIES`; duplicate choices collapsed and `SAME_LOT_ALL_CHOICES` flagged; `active=no` excluded and flagged `NO_LONGER_ON_CAMPUS`; `past_peak_count` stored as context only. | 3 | 5, 6, 7 |

### E3 — Allocation engine (22 SP)
| ID | Story | Acceptance criteria | SP | UAT |
|---|---|---|---|---|
| E3-S1 | As the admin, capacity is computed per lot, vehicle pool and shift window. | General capacity follows BR-1 from CSV values; unit tests cover defaults and edge values (0 visitor, 0 reserved). | 3 | 1 |
| E3-S2 | As the admin, accessibility holders are placed first, in accessible bays only. | Holders placed in choice order, then nearest lot with a free accessible bay; never placed in a general bay automatically; if no accessible bay exists → `NEEDS_DECISION`; accessible occupancy never exceeds 100%. | 5 | 4 |
| E3-S3 | As the admin, general applicants are placed by priority with shift sharing. | Choice-rank rounds (all first choices, then second, then third); within a lot ordered by type rank, then distance, then id; BR-3 fit check; night holders share bays with early/afternoon holders; same input always gives the same output. | 8 | 1, 2, 3, 5 |
| E3-S4 | As the admin, people who cannot be placed in a choice get a suggestion. | BR-9 applied; suggested placements count toward occupancy but are visually distinct; unplaced listed with reason. | 3 | 2, 7 |
| E3-S5 | As the admin, every outcome has a one-sentence reason. | Reason on 100% of placements, suggestions, unplaced and excluded records; reasons use templates (see ARCHITECTURE §5.5); no personal data beyond lot, choice rank, priority group and shift. | 3 | all |

### E4 — Allocation review (12 SP)
| ID | Story | Acceptance criteria | SP | UAT |
|---|---|---|---|---|
| E4-S1 | As the admin, the dashboard summarises the proposal. | Cards per lot: permits issued (car/bike), peak occupancy % with traffic-light colour, accessibility status, approval state; KPIs: % in choice 1/2/3, unplaced count, open decisions. | 3 | 1, 2 |
| E4-S2 | As the admin, I open a lot and see who is placed and how bays are shared. | Per-shift bar for each vehicle pool (early/afternoon/night vs capacity); applicant table with type, shift, choice rank, flags, reason; filter and search. | 5 | 2, 3 |
| E4-S3 | As the admin, accessibility is confirmed per lot. | Panel shows accessible bays vs holders placed per vehicle pool; green tick only when every holder in the term is in an accessible bay or has an open decision. | 2 | 4 |
| E4-S4 | As the admin, I can copy a shareable reason. | Copy button per row; text contains no other applicant's data. | 2 | all |

### E5 — Decision list (6 SP)
| ID | Story | Acceptance criteria | SP | UAT |
|---|---|---|---|---|
| E5-S1 | As the admin, I see a short list of applicants needing a decision. | List shows everyone with `NEEDS_DECISION`, `NO_LONGER_ON_CAMPUS`, or accessibility unmet first; filters by flag and lot; count shown on dashboard. | 3 | 2, 4, 6, 7 |
| E5-S2 | As the admin, I resolve a decision. | Actions: accept suggestion, move, keep unplaced (waitlist), confirm exclusion, reinstate inactive; each needs a note and writes to the audit log; resolved items leave the list. | 3 | 6 |

### E6 — Move with live checks (10 SP)
| ID | Story | Acceptance criteria | SP | UAT |
|---|---|---|---|---|
| E6-S1 | As the admin, I move an applicant and see checks update before saving. | Selecting a target lot shows before/after peak per shift for source and target within 500 ms; warnings for ≥ 90%; red for > 100%. | 5 | 2, 3 |
| E6-S2 | As the admin, rule-breaking moves are blocked or need a reason. | Moving a non-holder into an accessible bay, or exceeding accessible bays, is blocked with an explanation; exceeding general capacity requires an override reason; moving an approved lot's applicant reopens that lot's approval. | 3 | 4 |
| E6-S3 | As the admin, I can undo my last move. | Undo restores previous placement and occupancy; audit log records both. | 2 | — |

### E7 — Approve, finalize, export (9 SP)
| ID | Story | Acceptance criteria | SP | UAT |
|---|---|---|---|---|
| E7-S1 | As the admin, I approve a lot. | Approve disabled while lot has unresolved decisions or exceeds 100% without override; approval timestamped. | 3 | — |
| E7-S2 | As the admin, I finalize the term and export. | Finalize only when all 5 lots are approved; export CSV with applicant id, lot, bay type, shift, choice rank, status, reason; term becomes read-only. | 3 | — |
| E7-S3 | As the admin, every change is audited. | Audit log lists upload, run, move, override, decision, approve and finalize events with time and before/after values. | 3 | — |

### E8 — Synthetic data and UAT (6 SP)
| ID | Story | Acceptance criteria | SP | UAT |
|---|---|---|---|---|
| E8-S1 | As the team, we generate synthetic CSVs covering every UAT case. | Seeded generator produces ~180 applicants and 5 lots; at least one lot oversubscribed; named fixture rows for UAT-1..7 (see §8); no real names. | 3 | all |
| E8-S2 | As the team, UAT is scripted and repeatable. | `check-uat` runs the engine on the fixture and asserts each UAT expectation; result table in the PR. | 3 | all |

### E9 — CI/CD (5 SP)
| ID | Story | Acceptance criteria | SP | UAT |
|---|---|---|---|---|
| E9-S1 | As the team, every PR is linted, tested and built. | Workflow per [CICD.md](CICD.md); PR blocked on failure; engine coverage ≥ 90%. | 3 | — |
| E9-S2 | As the team, main deploys to staging automatically. | Merge to `main` deploys client and server to staging; tagged release deploys to production after manual approval. | 2 | — |

**Total: 86 SP.** For a 2-week sprint this needs about 3 developers at ~30 SP each. If capacity is lower, cut in this order: E6-S3 (undo), E4-S4 (copy reason), E7-S3 (full audit UI; keep the log, drop the screen), E9-S2 (production deploy).

## 8. UAT mapping
| UAT | Scenario | Synthetic fixture | Expected result |
|---|---|---|---|
| UAT-1 | Lot with fewer applicants than spaces | Lot E: ~8 car first-choice applicants, capacity 13 per window | All placed in Lot E; peak < 90%; no flags; reason "first choice, space available". |
| UAT-2 | Lot with more first-choice applicants than spaces | Lot A: ~30 car first-choice applicants, mostly early | Early window filled to 13 in priority order; the rest go to choice 2/3 or get a suggestion; each displaced applicant has a reason naming the higher-priority group or the full window. |
| UAT-3 | Night shift sharing with day staff | Lot A: 6 night-shift applicants | Placed in Lot A even though the early window is full; per-shift bar shows night load separately; reason mentions shared bay. |
| UAT-4 | Accessibility permit holder | 3 holders choose Lot A (2 accessible car bays) | 2 placed in Lot A accessible bays; third placed in nearest lot with a free accessible bay, or `NEEDS_DECISION`; accessible bays never > 100%; admin cannot move a non-holder in. |
| UAT-5 | Hours "varies" | 4 applicants with `varies` in Lot A | Treated as full day (consume all 3 windows); flagged `HOURS_VARIES`; reason says full-day assumption. |
| UAT-6 | No longer on campus | 2 applicants with `active_on_campus = no` | Not allocated; on decision list with `NO_LONGER_ON_CAMPUS`; admin can confirm or reinstate. |
| UAT-7 | Same lot for every choice | 3 applicants list `A, A, A` | Choices collapsed; flagged; if Lot A is full, nearest-lot suggestion with `NEEDS_DECISION`. |

## 9. Non-functional requirements
- Allocation of 500 applicants completes in < 2 s; move preview < 500 ms.
- Deterministic engine: identical inputs give identical outputs (tested).
- Accessibility: UI meets WCAG 2.1 AA; occupancy colours always paired with text or icons.
- Privacy: synthetic data only; no medical data; accessibility flag visible only on the accessibility panel and in the applicant row.
- Security: bcrypt passwords, httpOnly session cookie, helmet, CSV size limit (2 MB), input validation on every endpoint.

## 10. Assumptions and open questions
1. **Reserved special-staff bays** are 5 car bays per lot, pre-assigned outside this tool and removed from capacity. Confirm per lot vs campus-wide.
2. **Shift windows** follow BR-2. A 09:00–17:00 "day staff" worker overlaps early and afternoon; in the MVP they should enter `varies`. Should we add a `day` value (early + afternoon)?
3. **Home block to lot distance** comes from distance columns in `lots.csv` (metres to each block).
4. **Expected occupancy** assumes every permit holder attends on every shift day (attendance factor 1.0). An attendance factor can be added later.
5. **Accessibility holders when no accessible bay is free:** the engine does not place them in general bays automatically. The admin decides (for example, a general bay in the chosen lot plus a note).
