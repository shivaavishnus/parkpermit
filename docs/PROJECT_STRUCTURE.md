# ParkPermit — Project Structure

npm workspaces monorepo (`client`, `server`). Node 20, ES modules.

```
parkpermit/
├── CLAUDE.md                     # rules and conventions for Claude Code and humans
├── README.md
├── package.json                  # workspaces, root scripts: lint, test, uat, gen:data
├── .nvmrc  .editorconfig  .prettierrc  eslint.config.js
├── .env.example
├── docker-compose.yml            # mongo:7 for local dev
├── .github/
│   ├── workflows/ci.yml
│   ├── workflows/deploy.yml
│   └── pull_request_template.md
├── .claude/
│   └── skills/
│       ├── generate-synthetic-data/SKILL.md
│       ├── write-tests/SKILL.md
│       ├── review-code/SKILL.md
│       ├── ui-ux/SKILL.md
│       ├── write-user-stories/SKILL.md
│       ├── run-allocation/SKILL.md
│       └── check-uat/SKILL.md
├── scripts/
│   ├── deploy.sh  smoke.sh
│   ├── check-data-manifest.js    # real-data guard (npm run check:data)
│   └── uat-coverage.js           # UAT coverage + oversubscription report
│
├── client/                       # React + Vite
│   ├── index.html  vite.config.js  package.json
│   └── src/
│       ├── main.jsx  App.jsx  routes.jsx
│       ├── api/                  # fetch wrapper + hooks (TanStack Query)
│       │   ├── client.js  auth.js  terms.js  allocation.js  moves.js
│       ├── pages/
│       │   ├── LoginPage.jsx  DashboardPage.jsx  UploadPage.jsx
│       │   ├── LotDetailPage.jsx  DecisionsPage.jsx  AuditPage.jsx
│       ├── components/
│       │   ├── LotCard.jsx  OccupancyBars.jsx  AccessibilityPanel.jsx
│       │   ├── ApplicantTable.jsx  MoveDialog.jsx  FlagChip.jsx
│       │   ├── ReasonCell.jsx  ValidationReport.jsx  KpiStrip.jsx
│       ├── styles/
│       └── __tests__/
│
├── server/                       # Express API
│   ├── Dockerfile  package.json  vitest.config.js
│   └── src/
│       ├── index.js  app.js      # app.js exports the express app for Supertest
│       ├── config/
│       │   ├── env.js
│       │   └── allocation.js     # shift windows, priority order, risk threshold
│       ├── middleware/
│       │   ├── requireAuth.js  validate.js  errorHandler.js  rateLimit.js
│       ├── routes/
│       │   ├── auth.js  terms.js  upload.js  allocation.js
│       │   ├── moves.js  decisions.js  approvals.js  export.js  audit.js
│       ├── services/
│       │   ├── ingestService.js  allocationService.js  moveService.js
│       │   ├── decisionService.js  approvalService.js  auditService.js
│       ├── ingest/
│       │   ├── parseCsv.js  schemas.js  normalise.js   # varies, same-lot, inactive, past occupancy
│       ├── engine/               # PURE: no I/O, no mongoose imports
│       │   ├── index.js          # allocate()
│       │   ├── capacity.js  exclusions.js  accessibilityPass.js
│       │   ├── generalPass.js  fallback.js  flags.js  reasons.js
│       │   ├── checks.js         # fits(), previewMove(), assertInvariants()
│       │   ├── sort.js           # priority comparator
│       │   └── cli.js            # read-only CLI used by the run-allocation skill
│       ├── models/
│       │   ├── User.js  Term.js  Lot.js  Applicant.js  Allocation.js  AuditEvent.js
│       └── seed/seedAdmin.js
│   └── test/
│       ├── engine/               # one file per engine module + determinism + invariants
│       ├── ingest/
│       ├── api/                  # Supertest + mongodb-memory-server
│       └── uat/uat.test.js       # UAT-1..7 against data/fixtures/uat
│
├── data/                         # SYNTHETIC ONLY
│   ├── generator/
│   │   ├── generate.js           # seeded (default seed 42)
│   │   └── scenarios.js          # UAT fixture rows
│   ├── fixtures/uat/
│   │   ├── applications.csv  lots.csv  expected.json
│   ├── samples/                  # larger generated sets for demos
│   └── MANIFEST.json             # hashes of generated files (real-data guard)
│
└── docs/
    ├── BRIEF.md  PRD.md  ARCHITECTURE.md  APP_FLOW.md
    ├── CICD.md  PROJECT_STRUCTURE.md  SKILLS.md
```

## Conventions
- `server/src/engine/**` must not import from `models`, `services`, `express` or `fs`. An ESLint `no-restricted-imports` rule enforces this.
- One test file per engine module (`*.test.js`) in `server/test/engine/`.
- Files: camelCase `.js`; React components PascalCase `.jsx`.
- Root scripts: `npm run dev` (concurrently client + server), `npm run gen:data`, `npm run uat`, `npm run lint`, `npm test`.
