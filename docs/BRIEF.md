# Source Brief — Campus Parking Permit Allocation (Team 1)

> Copied from the use-case brief supplied at project start. `Team_1_Usecase.html` was not in the repo, so this text is the reference copy.

## Context
A university has several parking lots with different sizes and distances to buildings. Each term hundreds of staff, faculty, contractors and students apply for permits. Lots have fixed capacity, some bays are reserved for accessibility, visitors and special staff, and people arrive and leave at very different times (early cleaners, day staff, evening lecturers, night security). The parking administrator decides who gets a permit for which lot, how many permits per lot, and what to do with people who cannot be placed. Too many permits means people circling for spaces, too few leaves spaces empty, and missing an accessibility need is unfair and a compliance problem.

Example: a lot holds 300 cars and 340 list it first. 40 work nights and could share bays with day staff. 6 hold accessibility permits and the nearest accessible bays are there. The admin must decide how many permits to issue, who goes elsewhere, and explain why.

## Goal
Load applications and lot data, see a proposed allocation per lot with expected peak occupancy, accessibility confirmed, a short list of applicants needing a decision, a reason for each placement, and move an applicant to see occupancy checks update.

## Known data issues (must be handled)
- Applicants listing the same lot for every choice
- Hours given as "varies"
- Permits held by people no longer on campus
- Past occupancy counts that include visitors and contractors

## UAT
1. Lot with fewer applicants than spaces
2. Lot with more first-choice applicants than spaces
3. Night-shift applicants sharing with day staff
4. Accessibility permit holder
5. Hours listed as "varies"
6. Permit held by someone no longer on campus
7. Same lot for every choice

## Success measures
Less admin time per term; share of applicants placed in a lot they chose; peak occupancy within safe limits; accessibility honored in every case; admin confidence in the reasons.

## Constraints
Synthetic data only; accessible bays never reallocated or oversold, accessibility records used only to honor the need; no placement based on personal characteristics beyond campus priority rules; admin keeps final control over every permit and placement.
