# Next.js launch and Streamlit retirement plan

## Outcome

`waiver-ops-web` becomes the only product user interface. The Python repository
continues as a framework-neutral recommendation service exposed through
FastAPI, and `waiver-intelligence` remains a separate scheduled producer.
The retired Python UI has been removed from `waiver-ops`; its final revision is
preserved by the `streamlit-final` Git tag.

The replacement is a product cutover, not a screen-for-screen port. Features
that do not support the primary waiver decision flow are hidden until they are
complete rather than represented by placeholder pages.

The step-by-step account, secret, hosting, domain, verification, and shutdown
instructions are in [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).

## Repository boundaries

| Repository | Owns | Must not own |
| --- | --- | --- |
| `waiver-ops-web` | Next.js UI, browser navigation, Auth0 integration, server-side FastAPI client, frontend tests, Vercel configuration | Recommendation rules, direct Postgres access, provider tokens, scheduled ingestion |
| `waiver-ops` | FastAPI, identity and tenant authorization, recommendation engine, provider adapters, persistence, migrations, API contract tests | React components, browser state, Streamlit after cutover |
| `waiver-intelligence` | Collection, extraction, aggregation, player-signal publication, scheduled worker operations | Product sessions, league UI, recommendation presentation |

These boundaries are enforced in CI:

- Frontend code may call only the versioned FastAPI contract; it may not import
  Python logic or connect to Neon.
- Core Python and `waiver_api` may not import Streamlit or any Streamlit entry
  point.
- Provider credentials, database credentials, and OIDC tokens never enter a
  `NEXT_PUBLIC_*` variable or browser bundle.
- Paid and scheduled intelligence work never runs in an HTTP request.

## Current state

Already complete:

- The versioned FastAPI application boundary, application service, session
  exchange, tenant authorization, provider connections, league data,
  recommendations, player evidence, preferences, refresh, and Yahoo OAuth
  endpoints exist and have contract tests.
- The Next.js App Router shell, Auth0 integration, protected routes, local
  development identity, Sleeper connection, Yahoo route adapters, league
  browser, recommendation board, filters, and player evidence pages exist.
- One command starts the local FastAPI and Next.js stack from this repository:
  `npm run dev:stack`.
- Published player-signal snapshots have a Postgres contract and fail-neutral
  behavior in the Python service.

Known launch gaps:

- Settings and top-level intelligence are intentionally excluded from the MVP
  navigation; old route bookmarks redirect to live connection and league
  surfaces.
- Manual refresh has no complete user feedback loop.
- Rival-interest data is not fully presented in Next.js.
- Critical authenticated browser flows do not yet have Playwright coverage.
- Vercel, Render, Auth0, the production domain, CORS, secure sessions, and Neon
  are deployed and have passed the authenticated hosted smoke test.
- Sleeper connection and league loading are live. Yahoo-specific acceptance is
  deferred while Yahoo reviews the Fantasy Sports API application.
- The retired Python UI source, dependencies, tests, assets, and tracked
  configuration have been removed from `waiver-ops`.

## Critical path

### Phase 1 — Freeze the launch surface

Status: **complete.** The MVP navigation contains only Dashboard and Leagues;
connection management remains the persistent secondary action. The unfinished
Settings and top-level Intelligence destinations are no longer advertised,
their old URLs redirect to useful live routes, and the dashboard intelligence
CTA opens the recommendation workflow where player evidence is already
available.

The launch-critical flow is:

1. Sign in.
2. Connect Sleeper or Yahoo.
3. Select an authorized league.
4. View ranked waiver recommendations and explanations.
5. Open a player's aggregated intelligence and evidence.
6. Request a refresh and understand whether it completed, was deduplicated, or
   failed.
7. Sign out.

For the first production cutover:

- Complete refresh feedback and rival-interest presentation.
- Implement only preferences required by the primary flow, such as hidden or
  default leagues.
- Either implement a useful top-level intelligence index with a supporting API
  list/search endpoint, or remove that navigation item. Do not ship a
  placeholder.
- Hide any account setting that is not functional. Connection management can
  remain on its dedicated page.
- Preserve explicit loading, empty, stale, offline, forbidden, and provider
  failure states.

Exit gate: every visible navigation item is functional and the full launch
flow works locally for both a populated fixture user and an empty new user.

### Phase 2 — Finish the browser contract

Status: **core implementation complete.** Saved default-league preferences,
explicit refresh feedback, rival-market context, runtime response validation,
client-bundle secret scanning, and the critical recommendation journey are now
implemented. Playwright exercises the deterministic product flow, redirects
retired routes, and proves that guessed cross-tenant league URLs fail closed.
The remaining Auth0 login/logout/session-repair and live provider-failure smoke
checks require hosted callback URLs and credentials, so they are part of the
Phase 4 preview-deployment gate rather than local development.

- Add Server Actions or route handlers for preference updates and refresh.
- Invalidate affected server-rendered routes after mutations so the result is
  visible without a manual reload.
- Add accessible pending, success, deduplicated, stale-data, and failure
  feedback.
- Render rival-interest and market context already returned by the
  recommendation API; change the API contract only if required data is absent.
- Generate or verify TypeScript contract fixtures from FastAPI's OpenAPI schema
  to prevent silent drift.
- Add Playwright tests for sign-in/session repair, new-user connection,
  league/recommendation navigation, filters, player evidence, refresh, tenant
  denial, provider failure, and sign-out.
- Add automated checks for keyboard navigation, focus visibility, mobile
  layout, and accidental secrets in built client assets.

Exit gate: lint, type checking, production build, component/contract tests, and
critical Playwright flows pass in CI.

### Phase 3 — Make FastAPI production-ready

Status: **repository implementation complete.** `waiver-ops` now has an
API-only dependency set, a non-root Python 3.11 container, a Render Blueprint,
hosted configuration validation, JSON request logs and request IDs, health
probes, graceful shutdown, CORS/cookie security tests, and a CI job that imports
and tests FastAPI without Streamlit before building the Linux image. Live-host
and isolated-Neon smoke checks remain part of Phase 4.

- Package the Python runtime around `waiver_api`; keep recommendation and
  provider modules independent of both web frameworks.
- Add a production container and an explicit process command with bounded
  workers, health checks, graceful shutdown, provider timeouts, and a known
  Python version.
- Split runtime and development dependencies. Streamlit may remain only in a
  temporary deployment-specific dependency file until cutover; it must not be
  required to install or test FastAPI.
- Validate required configuration at startup without logging secrets.
- Configure structured logs, request IDs, error reporting, readiness probes,
  and alerts for authentication, provider, database, and stale-intelligence
  failures.
- Run migrations with the owner/direct Neon connection before deployment; run
  the API with the pooled least-privilege `waiver_app` connection.
- Prove two-user isolation, CORS allow-list behavior, secure cookie behavior,
  recommendation parity, and read-only intelligence access against an isolated
  Neon branch.

Exit gate: the hosted API passes health, contract, security, and representative
league smoke tests without Streamlit installed in that runtime.

### Phase 4 — Deploy the replacement stack

Status: **complete for Auth0 and Sleeper.** Vercel serves `waiverops.com`,
Render hosts FastAPI, Neon is connected with restricted runtime credentials,
Auth0 login/logout works on the production origin, and the live Sleeper flow
loads league records. Yahoo-specific acceptance remains deferred pending API
approval.

1. Deploy FastAPI to the selected managed Python container host and attach
   `api.waiverops.com`.
2. Configure production Neon runtime and migration roles, encryption key,
   Auth0 issuer/audience/JWKS values, strict CORS origins, and Yahoo credentials.
3. Configure Auth0's production callback, logout, and web origins.
4. Deploy `waiver-ops-web` to Vercel with server-only
   `WAIVER_API_BASE_URL=https://api.waiverops.com` and the Auth0 secrets.
5. Configure Yahoo's production callback through the Next.js route.
6. Validate the launch flow on a Vercel preview against a non-production Neon
   branch, then repeat the same checks in production.
7. Point `waiverops.com` at Vercel only after the production smoke test passes.

Exit gate: a real account can authenticate, connect each supported provider,
load an authorized league, receive the expected intelligence-adjusted
recommendations, refresh, and sign out over the production domains.

### Phase 5 — Remove Streamlit completely

Status: **repository cleanup complete; hosted-service shutdown remains.** The
`streamlit-final` tag is published and the Python UI, dependency, tracked
configuration, tests, helper scripts, visual asset, and obsolete local-news
compatibility layer are gone from `waiver-ops`. The remaining operational step
is to disable the Community Cloud application and remove or rotate its secrets.

Create an annotated `streamlit-final` Git tag before removal. Do not create a
permanent legacy repository or legacy source folder; the tag and Git history
are the recovery artifact.

In `waiver-ops`:

- Extract any still-reused calculation or orchestration from
  `streamlit_app.py` into a framework-neutral module with focused tests.
- Delete `streamlit_app.py`, Streamlit-only dashboard state helpers and tests,
  `.streamlit/`, `run_app.bat`, local Streamlit HTTPS helpers/certificates, and
  obsolete Streamlit visual assets.
- Remove `streamlit[auth]` and any UI-only dependency from the API runtime.
- Remove the old static landing implementation after equivalent routes exist
  in Next.js.
- Rewrite README, product, design, multi-tenancy, deployment, and CI references
  so FastAPI is the repository's only application runtime.
- Add a CI boundary test that fails if production Python imports `streamlit` or
  if the dependency returns.

Operationally:

- Delete or disable the Streamlit Community Cloud application.
- Remove its secrets and revoke or rotate credentials that were available to
  it.
- Remove `waiverops.streamlit.app` from user-facing documentation and provider
  allow lists.
- Use normal Vercel/FastAPI deployment rollback for incidents; Streamlit is not
  the rollback path.

Exit gate: no Streamlit source, dependency, configuration, deployment, secret,
or documentation remains on `main`, and both local and hosted product flows use
Next.js → FastAPI exclusively.

## Pull-request sequence

Keep each change independently releasable and use this order:

1. `web/launch-surface` (**complete**): remove placeholders from navigation and
   lock the MVP route set.
2. `web/refresh-rivals-preferences`: finish the remaining primary-flow UI.
3. `web/e2e-launch-gates`: add Playwright, contract drift, accessibility, and
   client-secret checks.
4. `api/production-runtime`: container, dependency split, configuration,
   observability, and Neon branch validation.
5. `deploy/preview-stack`: deploy the API and Vercel preview with production-
   shaped configuration.
6. `deploy/production-cutover`: production smoke tests and domain switch.
7. `cleanup/remove-streamlit`: tag the last Streamlit revision, remove all
   Streamlit artifacts, disable the hosted app, and rotate its credentials.

The first three frontend changes and API production work can progress
independently, but production cutover waits for all exit gates. Database schema
changes remain additive, and no intelligence ingestion records move into the
product database as part of this launch.

## Definition of done

- `waiverops.com` serves the Vercel Next.js application and
  `api.waiverops.com` serves FastAPI.
- Auth0 and Yahoo use only the production HTTPS routes.
- Every visible route is complete on desktop and mobile.
- The browser contains no database credential, provider token, OIDC token, or
  FastAPI session value accessible to JavaScript.
- Recommendation output matches fixed Python fixtures and a representative
  production league, including intelligence modifiers and neutral fallback.
- Cross-user access, stale intelligence, unavailable providers, and failed
  refreshes are tested and observable.
- Streamlit is absent from source, dependencies, deployment, secrets, and
  operating documentation.
