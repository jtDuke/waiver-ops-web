# WaiverOps — operations and handoff

Prepared September 11, 2026. Companion to [CURRENT_STATE.md](CURRENT_STATE.md) and [WEBSITE_REBUILD_SPEC.md](WEBSITE_REBUILD_SPEC.md). Configuration names are included; **secret values are not**.

## Local setup

Clone the repositories as siblings. If using the existing launchers, retain the historical API directory name `waiver_priority` and producer directory name `waiver_intelligence`.

From the API repository, using Python 3.11+ (the production image uses Python 3.11):

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

From the web repository, with a Node version compatible with the committed Next.js version (the project has used Node 24):

```powershell
npm ci
npm run dev:stack
```

Open `http://localhost:3000`. The stack launcher starts/reuses the sibling API at port 8000. Stop with Ctrl+C. Git Bash/macOS/Linux launcher: `./scripts/dev-stack.sh`. For manual startup, run API `python -m uvicorn waiver_api.main:app --reload --port 8000` in its virtual environment and web `npm run dev` separately.

Local development uses explicit development identity, not production Auth0. Copy only configuration templates when needed; never overwrite existing environment files. API docs: `http://localhost:8000/api/docs`; machine contract: `/api/openapi.json`.

Producer setup is separate:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --editable .
waiver-intelligence db init
waiver-intelligence status
```

Do not point the producer at the API's SQLite store. Do not run transcription, extraction, pruning, or unattended ingestion just to start the website. Those operations have separate cost/data consequences.

## Configuration ownership

| Location | Names / values |
| --- | --- |
| Vercel | `WAIVER_WEB_AUTH_MODE=auth0`, `APP_BASE_URL=https://waiverops.com`, server-only `WAIVER_API_BASE_URL=https://waiver-ops-api.onrender.com` |
| Vercel secret settings | `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` |
| Render runtime | `WAIVER_RUNTIME=hosted`, `WAIVER_AUTH_MODE=oidc`, `WAIVER_DATABASE_AUTO_CREATE=false`, `WEB_CONCURRENCY=1` |
| Render identity | `WAIVER_OIDC_PROVIDER=auth0`, `WAIVER_OIDC_ISSUER`, `WAIVER_OIDC_AUDIENCE` (Auth0 client ID), `WAIVER_OIDC_JWKS_URL` |
| Render secrets | `WAIVER_DATABASE_URL` (pooled restricted `waiver_app`), `WAIVER_API_SESSION_SECRET`, `WAIVER_TOKEN_ENCRYPTION_KEY` |
| Render origins | `WAIVER_PUBLIC_ORIGIN=https://waiverops.com`, exact `WAIVER_CORS_ORIGINS` |
| Render data selection | `WAIVER_PUBLIC_SOURCE_CACHE=postgres`, `WAIVER_PLAYER_SIGNAL_SOURCE=postgres` or hosted `auto`, correct `WAIVER_SEASON` |
| API migration shell only | `WAIVER_DATABASE_URL_UNPOOLED` / supported `DATABASE_URL_UNPOOLED` alias: direct owner connection |
| Producer operational store | `DATABASE_URL` means its service-owned SQLite store, not the API's production user database |
| Producer publication | `INTELLIGENCE_DATABASE_URL`: pooled restricted writer; `INTELLIGENCE_DATABASE_URL_UNPOOLED`: migration owner only |
| Producer paid processing | `OPENAI_API_KEY` and explicit automation/cost-cap settings; never inject into the API or frontend |

Do not copy the same secret between Auth0 cookie encryption and API session signing. Do not inject any migration-owner connection into running web/API services. Keep Vercel system variables enabled for hosted configuration guards. Account-side settings can differ from committed blueprint defaults: notably public Postgres caching must be explicitly configured.

Auth0 Regular Web Application URLs:

- Callback: `https://waiverops.com/auth/callback`
- Logout: `https://waiverops.com`
- Web origin: `https://waiverops.com`

Provider connection availability, including Google login, depends on Auth0 configuration as well as application code. Yahoo remains paused pending approval; do not use its unfinished acceptance as a prerequisite for Sleeper development.

## Database and publication operations

Production product data uses Neon. API runtime role `waiver_app` must not bypass tenant RLS and only reads intelligence. Producer `waiver_intelligence_writer` has schema usage and snapshot SELECT/INSERT, not UPDATE/DELETE or product-user authority. Owner migrations are separate from runtime traffic.

For schema changes: create an isolated Neon branch, obtain that branch's specific owner/runtime connections, apply migrations, verify constraints/grants/tenant isolation, then apply the tested change to production with authorization. Do not reuse production connection strings while believing a branch is selected.

API migration entry point, from API virtual environment with an authorized direct owner connection already injected:

```powershell
python -m alembic upgrade head
python -m scripts.verify_neon_schema
python -m scripts.verify_neon_runtime
```

Producer migrations run from its repository and separate Alembic history. See its `docs/postgres_publication.md` for role provisioning and validation. Never merge migration histories or run owner migrations during normal web requests.

For an already-configured producer:

```powershell
waiver-intelligence signals publish --json
```

Publication makes no paid API calls but **does mutate the external database**. Run only when authorized. `signals refresh` is local generation and may involve configured summarization; do not assume every refresh is free. Publishing an old generated snapshot does not make its evidence current. A persistent publication schedule is not verified by these docs.

## Verification and release

Web:

```powershell
npm run lint
npm run typecheck
npm run build
npm run check:client-boundary
npm run check:hosted-config
npm run test:e2e
```

Install the browser once if needed: `npx playwright install chromium`. Browser tests run against a synthetic API fixture and production web build; they do not replace real Auth0/provider acceptance.

API:

```powershell
.\.venv\Scripts\python.exe scripts/check_api_boundary.py
.\.venv\Scripts\python.exe -m pytest -q
```

Use the complete suite, including root engine tests. Run optional database integration against an isolated test branch when changing persistence. CI builds the API image and exercises a synthetic memory workload with a 512 MiB limit. Preserve that regression gate; do not treat a passing synthetic run as a production load test.

Release sequence:

1. Inspect dirty files and preserve unrelated work. Use a `codex/` feature branch and explicit staging.
2. Pass local tests and feature CI on the exact intended commit.
3. If deployment is authorized, fast-forward main without force. Deploy compatible API additions before their UI consumers.
4. Render builds the API Dockerfile after checks; Vercel builds the web project. Do not change hosting tiers to bypass performance investigation.
5. Verify main CI, deployment status, API health/release marker, and public domain response.
6. Review an authenticated populated league: roster, recommendations, Pulse, filters, evidence, refresh, and mobile layout. Public HTTP 200 alone does not prove this flow.

## Diagnostics

| Symptom | First checks |
| --- | --- |
| Board 502/503/504 | Request ID, API logs, health, release, timeout/admission behavior, provider failures; do not conclude memory leak from the status alone |
| Busy analysis | Cold-calculation admission/duplicate wait limits, cache hits, repeated refreshes; avoid unbounded queues or more workers without measurement |
| No useful moves | Projection/scoring completeness, ownership/slots, net add/drop thresholds, drop protections; standing pat may be correct |
| Neutral intelligence | Snapshot generated time, six-hour freshness, schema/validation, source setting, reader permissions; baseline behavior is intentional |
| No roster in saved analysis | Old payload/cache namespace or stale deployment; current UI tolerates absent roster fields |
| No Google sign-in | Auth0 connection/application enablement and callback/origin configuration, not necessarily a frontend bug |
| Public cache appears local | Explicit `WAIVER_PUBLIC_SOURCE_CACHE`, startup validation, `X-Waiver-Public-Cache` readiness header |
| Memory rises | Repeated-work profiling, candidate/response cardinality, cache bytes/TTL, raw response lifetime, retained objects; measure before upgrading |

Health: `/health/live` and `/health/ready`. Diagnostic headers include `X-Waiver-Release`, readiness `X-Waiver-Public-Cache`, recommendation cache/timing headers, and request IDs. A cache-selection header proves selected backend, not hit rate or all-league correctness.

## Rollback and remaining work

Revert application code to a tested compatible release rather than resurrecting Streamlit. Leave additive data tables in place unless a separately reviewed migration requires otherwise. Switching intelligence to file only works with a valid deployed file; otherwise neutral baseline is expected. Do not delete producer SQLite data or user-owned files as a rollback shortcut.

Next work: real-league UX review and typography polish; decision-quality calibration; production soak/load measurement; durable scheduled intelligence worker with cost controls, backups and restore tests; richer ranking/statistics/teammate inputs. Yahoo stays gated on approval.

## Handoff checklist

- Provide all three docs and identify whether source code is available.
- Record current commit IDs, migrations, test results, and deployed release separately.
- List uncommitted changes; do not imply they are in GitHub.
- Transfer secrets only through an approved secret manager, never documentation or chat.
- State which integrations are live, which are fixtures, and which require approval.
- Require explicit authorization for paid processing, destructive migration, or hosting changes.
