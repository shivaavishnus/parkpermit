# ParkPermit — Skills

## 1. Team skills per epic
| Epic | Primary skills | Supporting |
|---|---|---|
| E1 Auth & shell | Express middleware, JWT/cookie sessions, bcrypt, React Router | Security review |
| E2 Ingest | CSV parsing (papaparse), zod schemas, data-quality rules | Domain knowledge of the known data issues |
| E3 Engine | Algorithm design (greedy and priority allocation), pure functional JS, unit testing, property tests | Parking ops domain (shifts, accessibility policy) |
| E4 Review UI | React, data-heavy tables, accessible charts (per-shift bars), WCAG 2.1 AA | UX writing for reasons and labels |
| E5 Decisions | React forms, REST design | Product: decision taxonomy |
| E6 Move | Optimistic concurrency, debounced preview calls, dialog UX | Engine (`checks.js`) |
| E7 Approve/export | State machines, CSV export, audit logging | Compliance review |
| E8 Synthetic data/UAT | Seeded data generation, test fixtures, QA scripting | Product owner for UAT sign-off |
| E9 CI/CD | GitHub Actions, Docker, hosting provider, MongoDB Atlas | Secrets management |

Roles for the sprint: **Product owner** (parking admin proxy, signs off UAT), **Tech lead** (engine and architecture), **Full-stack dev ×2** (API and UI), **QA** (part-time; UAT scripts, can be the tech lead).

## 2. Claude Code skills (`.claude/skills/`)
Each skill is a folder with a `SKILL.md` (YAML frontmatter `name` and `description`, then instructions). Claude Code loads a skill when its description matches the task; you can also call one by name, e.g. `/check-uat`.

| Skill | Use it when | Main guardrail |
|---|---|---|
| [`generate-synthetic-data`](../.claude/skills/generate-synthetic-data/SKILL.md) | A new sample, a fixture edge case or a coverage check is needed | Synthetic only; refuses real CSVs; asks before `expected.json` changes |
| [`write-tests`](../.claude/skills/write-tests/SKILL.md) | Adding engine, ingest, UAT, API or client tests | Tests named after rules; engine coverage ≥ 90%; never edit `expected.json` |
| [`review-code`](../.claude/skills/review-code/SKILL.md) | Before opening or merging a PR | Blocks on any breach of the CLAUDE.md non-negotiables (R1–R10) |
| [`ui-ux`](../.claude/skills/ui-ux/SKILL.md) | Designing, building or auditing a screen, or writing UI copy | WCAG 2.1 AA; occupancy never by colour alone; no override UI for accessible bays |
| [`write-user-stories`](../.claude/skills/write-user-stories/SKILL.md) | Adding or refining backlog items in PRD.md | In scope, INVEST, Fibonacci SP, mapped to UAT and BR rules |
| [`run-allocation`](../.claude/skills/run-allocation/SKILL.md) | Inspecting engine output, explaining a placement, diffing a change | Read-only; never writes to MongoDB or `data/` |
| [`check-uat`](../.claude/skills/check-uat/SKILL.md) | Before a PR touching the engine, ingest or data; "are we UAT-ready?" | Never weakens assertions or edits `expected.json` to pass |

`review-code` is named so that it does not shadow Claude Code's built-in `/code-review`. Use both: the built-in one hunts generic bugs, and this one checks ParkPermit's rules.

### Helper scripts used by the skills
- `scripts/check-data-manifest.js` (`npm run check:data`): real-data guard that fails on any file in `data/` that is not in `MANIFEST.json`, or whose hash no longer matches.
- `scripts/uat-coverage.js`: UAT-1..7 row counts, data-issue counts, and first-choice demand vs general capacity per window. Fails if a case is empty or no lot is oversubscribed.

### Optional, later
- `new-story` scaffolds a branch, test stub and PR template from a story ID in PRD.md.
- `explain-placement` produces an admin-friendly explanation of one applicant's outcome for appeals.
