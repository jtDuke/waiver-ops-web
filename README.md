# Waiver Ops Web

The standalone Next.js frontend for Waiver Ops. This repository owns the web
experience only; the tested recommendation engine and provider integrations
remain behind the versioned Python/FastAPI API in `waiver-ops`.

The production architecture and remaining launch work are maintained in
[NEXTJS_LAUNCH_PLAN.md](NEXTJS_LAUNCH_PLAN.md). The matching one-time and
repeatable hosting instructions are in
[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).

## Local development

The local product has two processes because the repositories have separate
responsibilities:

- `waiver_priority` runs the Python recommendation engine and FastAPI service.
- `waiver-ops-web` runs the Next.js interface and owns all npm dependencies.

From `waiver-ops-web`, install the frontend dependencies once:

```powershell
cd "C:\Users\jtryg\OneDrive\Desktop\Fantasy Football\2026\waiver-ops-web"
npm install
```

Then use one command whenever you want to run the complete local application:

```powershell
npm run dev:stack
```

Open `http://localhost:3000` for the public site or
`http://localhost:3000/dashboard` for the signed-in product. Press `Ctrl+C`
once to stop both processes. The
launcher reuses an API already running on port 8000; otherwise it starts the
sibling service, waits for its health check, and shuts it down with Next.js.
Backend startup logs are kept under `.devlogs/` if troubleshooting is needed.

Git Bash, macOS, and Linux users can run the equivalent launcher directly:

```bash
./scripts/dev-stack.sh
```

To run the processes manually instead, start FastAPI from `waiver_priority`
and run `npm run dev` from `waiver-ops-web` in a second terminal.

Next.js uses `http://127.0.0.1:8000` automatically in development. Copy
`.env.example` to `.env.local` only when the API runs elsewhere.

Local development intentionally uses the FastAPI development identity, so an
Auth0 account is not required to work on the product UI.

## Hosted authentication

Auth0 is the initial OIDC provider. It owns sign-in only; FastAPI still resolves
the internal user, enforces tenant authorization, and owns the application
session. Next.js performs the ID-token exchange server-side, and neither the
Auth0 token nor the FastAPI session is exposed to browser JavaScript.

If Auth0's ID token expires before its browser session, the sync route performs
one fresh authorization round trip and retries once. A second rejection fails
closed on the session-error page. Logout always sends Auth0 an absolute
production return URL.

1. Create an Auth0 **Regular Web Application**.
2. Configure these application URLs:
   - callback: `https://<web-domain>/auth/callback`
   - logout: `https://<web-domain>`
   - web origin: `https://<web-domain>`
3. In Vercel, set `WAIVER_WEB_AUTH_MODE=auth0`, `AUTH0_DOMAIN`,
   `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL`, and
   the server-only `WAIVER_API_BASE_URL`.
4. In the FastAPI host, set:
   - `WAIVER_AUTH_MODE=oidc`
   - `WAIVER_OIDC_PROVIDER=auth0`
   - `WAIVER_OIDC_ISSUER=https://<auth0-domain>/`
   - `WAIVER_OIDC_AUDIENCE=<AUTH0_CLIENT_ID>`
   - `WAIVER_OIDC_JWKS_URL=https://<auth0-domain>/.well-known/jwks.json`
   - a separate 32-byte-or-longer `WAIVER_API_SESSION_SECRET`
5. Set Yahoo's callback to
   `https://<web-domain>/connections/yahoo/callback`. Next.js forwards the
   validated callback to FastAPI using the server-side application session.

The production public URLs are:

- home: `https://waiverops.com`
- privacy: `https://waiverops.com/privacy`
- terms: `https://waiverops.com/terms`
- signed-in product: `https://waiverops.com/dashboard`

## Architecture boundary

- Browser code never receives database credentials or provider tokens.
- `WAIVER_API_BASE_URL` is server-only; do not rename it with a
  `NEXT_PUBLIC_` prefix.
- FastAPI remains the authorization and business-logic boundary.
- Next.js route handlers adapt browser sessions and OAuth navigation, but they
  do not replace the Python recommendation engine or tenant authorization.

## Validation

```powershell
npm run lint
npm run typecheck
npm run build
npm run check:client-boundary
npm run check:hosted-config
npm run test:e2e
```

The browser suite uses a deterministic local FastAPI fixture and a production
Next.js build. Install Chromium once on a new development machine with
`npx playwright install chromium`.

## Deployment status

The Next.js application is live at `https://waiverops.com`, the FastAPI service
is deployed at `https://waiver-ops-api.onrender.com`, and Auth0 sign-in has
passed an end-to-end hosted smoke test. Sleeper account discovery and league
loading are live. Yahoo-specific acceptance is intentionally paused while
Yahoo reviews the Fantasy Sports API access application.

Vercel builds run a hosted-configuration guard before Next.js compilation;
keep system environment variables enabled so `VERCEL=1` is available. The
Python repository is API-only; its final legacy UI revision is preserved by the
`streamlit-final` Git tag and is not the rollback path.

## Recommendation performance

The recommendation route uses a stable progressive loading surface backed by
an authenticated same-origin progress endpoint. Cached responses avoid the
loader flash; cold requests show truthful backend stages and a long-wait
message instead of cycling skeleton containers.

The priority board contains meaningful net add/drop actions. Marginal positive
moves are collapsed under Small Edges, while market trends, league
transactions, and rival opportunities are collapsed under League Pulse. See
the performance-first Phase 6 in
[NEXTJS_LAUNCH_PLAN.md](NEXTJS_LAUNCH_PLAN.md) for measured baselines, release
gates, production monitoring, and rollback.
