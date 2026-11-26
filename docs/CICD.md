# ParkPermit — CI/CD

## 1. Branch strategy
Trunk-based with short-lived branches.

| Branch | Purpose | Rules |
|---|---|---|
| `main` | Always deployable; auto-deploys to **staging** | Protected: PR only, 1 approval, all checks green, linear history (squash merge), no force push |
| `feat/E<epic>-S<story>-<slug>` | Story work, e.g. `feat/E3-S3-general-pass` | Lives ≤ 2 days; rebased on `main` |
| `fix/<slug>` | Bug fixes | Same as feature |
| `chore/<slug>`, `docs/<slug>` | Tooling and docs | Same checks |
| Tags `v0.x.y` | Release to **production** | Created from `main`; deploy needs manual approval in the `production` environment |

Commits follow Conventional Commits (`feat(engine): shift-window fit check`). The PR title must reference a story ID.

## 2. PR checks (required)
| Check | Command | Fails when |
|---|---|---|
| Lint | `npm run lint` (ESLint + Prettier check, client and server) | Any error |
| Unit tests: engine | `npm run test:engine -w server` | Any failure, or engine coverage < 90% lines / branches |
| Unit + API tests | `npm test -w server` (Vitest + Supertest + mongodb-memory-server) | Any failure |
| Client tests | `npm test -w client` (Vitest + Testing Library) | Any failure |
| UAT fixture | `npm run uat` (runs engine on `data/fixtures/uat`, asserts UAT-1..7) | Any UAT expectation fails |
| Build | `npm run build -w client`, `docker build server` | Build error |
| Secret scan | gitleaks action | Secret detected |
| Real-data guard | script that fails if `data/` contains files not produced by the generator manifest | Unknown CSV committed |

PR template checklist: story ID, UAT cases touched, screenshots for UI changes, "engine output changed?" with fixture diff.

## 3. Workflows

### `.github/workflows/ci.yml`
```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run test:engine -w server -- --coverage
      - run: npm test -w server
      - run: npm test -w client
      - run: npm run uat
      - uses: actions/upload-artifact@v4
        with: { name: coverage, path: server/coverage }
  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build -w client
      - run: docker build -t parkpermit-server ./server
      - uses: actions/upload-artifact@v4
        with: { name: client-dist, path: client/dist }
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
```

### `.github/workflows/deploy.yml`
```yaml
name: deploy
on:
  workflow_run:
    workflows: [ci]
    types: [completed]
    branches: [main]
  push:
    tags: ['v*']
jobs:
  staging:
    if: github.event_name == 'workflow_run' && github.event.workflow_run.conclusion == 'success'
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh staging   # client → static host, server image → Node host
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          MONGODB_URI: ${{ secrets.MONGODB_URI_STAGING }}
      - run: ./scripts/smoke.sh ${{ vars.STAGING_URL }}   # /api/health + login page
  production:
    if: startsWith(github.ref, 'refs/tags/v')
    environment: production            # requires manual approval
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy.sh production
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          MONGODB_URI: ${{ secrets.MONGODB_URI_PROD }}
      - run: ./scripts/smoke.sh ${{ vars.PROD_URL }}
```

## 4. Environments and secrets
| Env | Client | Server | DB | Data |
|---|---|---|---|---|
| local | `vite` :5173 | `nodemon` :4000 | Docker `mongo:7` | generated synthetic |
| staging | static host preview | Node host | Atlas (staging) | seeded synthetic on each deploy |
| production | static host | Node host | Atlas (prod) | synthetic for the MVP |

Secrets live in GitHub Environments only: `MONGODB_URI_*`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `DEPLOY_TOKEN`. Nothing is committed. `.env.example` lists names only.

The hosting provider is not decided yet. `scripts/deploy.sh` keeps the workflow provider-agnostic until it is.

## 5. Definition of done (per story)
- Acceptance criteria met and demoed on staging
- Engine changes: unit tests added and UAT fixture still green
- Lint and all checks pass; reviewed and squash-merged
- Docs updated if behaviour, API or data model changed
