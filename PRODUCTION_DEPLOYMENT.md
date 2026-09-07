# Production deployment runbook

This runbook turns the three local repositories into the production service:

```text
waiverops.com              api.waiverops.com
Vercel / Next.js  ───────> Render / FastAPI  ───────> Neon Postgres
                                                       ▲
                                                       │ published snapshots
                                            Waiver Intelligence worker
```

The default host for the Python API is Render because it supports a normal
long-running FastAPI web service, health checks, custom domains, managed TLS,
and deploys from the existing GitHub repository. The API remains containerized
and portable; changing Python hosts later does not change the browser contract.

Do not start the production deployment until the `api/production-runtime` work
in [NEXTJS_LAUNCH_PLAN.md](NEXTJS_LAUNCH_PLAN.md) has added the production
container/Render definition, API-only dependencies, startup validation, and
observability.

## Accounts and values needed once

- Access to the `jtDuke/waiver-ops-web`, `jtDuke/waiver-ops`, and
  `jtDuke/waiver-intelligence` GitHub repositories.
- A Vercel account connected to GitHub.
- A Render account connected to GitHub.
- The existing Neon project, its direct owner connection, and a pooled
  least-privilege `waiver_app` connection.
- An Auth0 Regular Web Application.
- A Yahoo Developer application with Fantasy Sports access.
- Control of DNS for `waiverops.com`.

Use separate production values for every secret. Never copy a secret into this
file, GitHub, a browser-visible variable, a build argument, or a support
message.

Generate two unrelated secrets locally:

```powershell
# Auth0 cookie encryption: 64 hexadecimal characters
python -c "import secrets; print(secrets.token_hex(32))"

# FastAPI session signing: use a different output
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Generate the Yahoo token-encryption key from `waiver_priority`:

```powershell
.\.venv\Scripts\python.exe -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Store those outputs directly in the appropriate hosting dashboards.

## 1. Pass the local release gate

From `waiver-ops-web`:

```powershell
npm install
npm run lint
npm run typecheck
npm run build
```

From `waiver_priority`:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Run `npm run dev:stack` and manually complete the launch flow before touching
production configuration. The final launch gate will also include Playwright.

## 2. Prepare Neon

First test the exact migrations and privilege checks on a temporary Neon branch.
Use that branch's direct owner URL only in your local shell or ignored `.env`.
Never give the owner URL to Vercel or to the running API.

From `waiver_priority`:

```powershell
$env:DATABASE_URL_UNPOOLED = '<temporary-branch direct owner URL>'
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m scripts.configure_neon_role --verify-isolation
.\.venv\Scripts\python.exe -m scripts.verify_neon_schema
```

Run the API integration suite with the temporary branch configuration, then
repeat the migration and verification against production. Keep these two URLs
separate:

- `DATABASE_URL_UNPOOLED`: direct owner connection, used locally for migrations
  only.
- `WAIVER_DATABASE_URL`: pooled `waiver_app` connection, used by Render at
  runtime.

Set `WAIVER_DATABASE_AUTO_CREATE=false` in production. Confirm the application
role can manage only tenant-scoped product rows, can read published intelligence,
cannot write intelligence, and cannot bypass row-level security.

## 3. Configure Auth0

Create or select a **Regular Web Application**. During the first hosted smoke
test, use the stable Vercel production URL assigned to the project. At domain
cutover, replace it with the final values below:

- Allowed Callback URL: `https://waiverops.com/auth/callback`
- Allowed Logout URL: `https://waiverops.com`
- Allowed Web Origin: `https://waiverops.com`

Do not use a wildcard production callback. Record the Auth0 domain, client ID,
and client secret. The client secret is used only by Next.js on Vercel. FastAPI
validates the resulting ID token using the issuer, audience, and JWKS endpoint;
it does not need the Auth0 client secret.

## 4. Deploy FastAPI on Render

After the production-runtime files exist:

1. In Render, create a Web Service from `jtDuke/waiver-ops` and select `main`.
2. Use the repository's committed Docker/Blueprint configuration. The service
   command must ultimately bind Uvicorn to `0.0.0.0:$PORT`.
3. Set the HTTP health-check path to `/health/ready`.
4. Disable automatic database creation.
5. Add the production environment variables below in Render's Environment
   panel. Values marked secret must be pasted there, never committed.

| Variable | Production value |
| --- | --- |
| `WAIVER_RUNTIME` | `hosted` |
| `WAIVER_AUTH_MODE` | `oidc` |
| `WAIVER_OIDC_PROVIDER` | `auth0` |
| `WAIVER_OIDC_ISSUER` | `https://<your-auth0-domain>/` |
| `WAIVER_OIDC_AUDIENCE` | Auth0 client ID |
| `WAIVER_OIDC_JWKS_URL` | `https://<your-auth0-domain>/.well-known/jwks.json` |
| `WAIVER_API_SESSION_SECRET` | separate generated secret |
| `WAIVER_API_SESSION_HOURS` | `12` |
| `WAIVER_DATABASE_URL` | pooled restricted `waiver_app` URL |
| `WAIVER_DATABASE_AUTO_CREATE` | `false` |
| `WAIVER_PUBLIC_ORIGIN` | `https://waiverops.com` |
| `WAIVER_CORS_ORIGINS` | exact web origin; comma-separate an exact temporary test origin if needed |
| `WAIVER_PLAYER_SIGNAL_SOURCE` | `postgres` |
| `WAIVER_SEASON` | current product season |
| `YAHOO_CLIENT_ID` | Yahoo application client ID |
| `YAHOO_CLIENT_SECRET` | Yahoo application secret |
| `YAHOO_REDIRECT_URI` | `https://waiverops.com/connections/yahoo/callback` |
| `WAIVER_TOKEN_ENCRYPTION_KEY` | generated Fernet key |

Add licensed news-provider variables only if the API is still responsible for
that adapter at launch. Do not add `DATABASE_URL_UNPOOLED`, Neon owner
credentials, intelligence-writer credentials, or transcription/extraction API
keys to Render.

Before adding the custom domain, verify:

```text
https://<render-service>.onrender.com/health/live
https://<render-service>.onrender.com/health/ready
```

Then add `api.waiverops.com` in Render. Add the exact DNS record Render displays
at your DNS provider and wait for Render to verify the domain and issue TLS.
Retest both health endpoints through `https://api.waiverops.com`.

## 5. Configure Yahoo

In Yahoo Developer Network, set the application's callback domain/URI to the
exact HTTPS callback used by the web application:

```text
https://waiverops.com/connections/yahoo/callback
```

The same complete redirect URI must be used by the authorization request and
token exchange. The browser returns to Next.js; Next.js passes the validated
code and state to FastAPI using the server-side application session.

If testing first on the Vercel-assigned domain, temporarily use that exact
domain in both Yahoo and Render's `YAHOO_REDIRECT_URI`, then change both to
`waiverops.com` for cutover.

## 6. Deploy Next.js on Vercel

1. In Vercel, choose **Add New → Project** and import
   `jtDuke/waiver-ops-web`.
2. Accept Next.js framework detection, keep the repository root as the root
   directory, and use `npm run build`.
3. Add the following Production environment variables.

| Variable | Production value |
| --- | --- |
| `WAIVER_API_BASE_URL` | `https://api.waiverops.com` |
| `WAIVER_WEB_AUTH_MODE` | `auth0` |
| `AUTH0_DOMAIN` | Auth0 tenant domain, without credentials |
| `AUTH0_CLIENT_ID` | Auth0 client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 client secret |
| `AUTH0_SECRET` | generated 64-character hex value |
| `APP_BASE_URL` | `https://waiverops.com` |

None of these names may start with `NEXT_PUBLIC_`. Trigger a new deployment
after changing environment variables; existing deployments do not acquire new
values automatically.

Use the Vercel-assigned production URL for the initial smoke test. Add that
exact URL to Auth0 and Render CORS only for the duration of the test. A normal
push to a non-production branch creates a Vercel preview; do not connect a
random preview to production Neon or add wildcard Auth0 callbacks.

## 7. Attach `waiverops.com`

In the Vercel project, open **Settings → Domains** and add
`waiverops.com` (and `www.waiverops.com` if desired). Vercel will display the
exact A/CNAME/TXT records required. Because DNS may be hosted elsewhere, add
those exact records at the current DNS provider rather than copying generic
values from an old guide.

After Vercel verifies the domain and provisions TLS:

1. Update `APP_BASE_URL` to `https://waiverops.com` and redeploy.
2. Restrict Auth0 callback, logout, and web-origin settings to the final domain.
3. Restrict Render `WAIVER_CORS_ORIGINS` to the final domain and redeploy.
4. Update Yahoo and Render `YAHOO_REDIRECT_URI` to the final callback.
5. Confirm `https://waiverops.com/auth/login` returns through
   `https://waiverops.com/auth/callback`.

## 8. Production acceptance checklist

Use a real account and at least one representative league:

- `/health/live` and `/health/ready` succeed through the API domain.
- Sign-in, session repair, refresh after navigation, and sign-out work.
- Sleeper connects and discovers only the current user's leagues.
- Yahoo authorization returns to the final HTTPS callback and persists the
  connection.
- An unauthorized user or guessed league URL is denied.
- Recommendations match the fixed Python fixture and expected live league
  output.
- A fresh Postgres intelligence snapshot affects the expected players.
- Missing or stale intelligence leaves baseline projections unchanged.
- Player summaries aggregate evidence without exposing producer internals.
- Refresh shows pending, deduplicated/success, and failure outcomes.
- Mobile navigation, keyboard focus, empty accounts, and provider failure
  states are usable.
- Browser developer tools show no provider token, database URL, Auth0 ID token,
  or JavaScript-readable FastAPI session.
- Render, Vercel, and application logs contain request IDs and no secrets.

Record the deployed Git commit from each repository with the acceptance result.

## 9. Shut down Streamlit

Only after the checklist passes:

1. Create the annotated `streamlit-final` tag in `waiver-ops`.
2. Merge the `cleanup/remove-streamlit` change described in the launch plan.
3. Delete or disable the Streamlit Community Cloud application.
4. Remove all Streamlit secrets and rotate any credential that was available
   to that deployment.
5. Remove the Streamlit URL from Auth0, Yahoo, DNS, and documentation.

Rollback means promoting the last known-good Vercel deployment and rolling
Render back to its last healthy deploy. It does not mean restarting Streamlit.

## Repeatable release procedure

After the one-time setup, each normal release is shorter:

1. Merge only after backend tests and frontend lint/type/build/Playwright pass.
2. Apply reviewed additive migrations with the direct owner connection, if any.
3. Deploy and health-check FastAPI.
4. Deploy a Vercel preview and run critical browser smoke tests.
5. Promote/deploy Next.js production.
6. Run the production acceptance subset and inspect error logs.
7. Roll back the affected service if its checks fail.

## Official platform references

- [Vercel deployment environments](https://vercel.com/docs/deployments/environments)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel custom-domain setup](https://vercel.com/docs/domains/set-up-custom-domain)
- [Render FastAPI deployment](https://render.com/docs/deploy-fastapi)
- [Render health checks](https://render.com/docs/health-checks)
- [Render custom domains](https://render.com/docs/custom-domains)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Auth0 Next.js quickstart](https://auth0.com/docs/quickstart/webapp/nextjs)
- [Yahoo OAuth setup](https://developer.yahoo.com/oauth2/guide/openid_connect/getting_started.html)

