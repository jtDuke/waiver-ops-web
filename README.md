# Waiver Ops Web

The standalone Next.js frontend for Waiver Ops. This repository owns the web
experience only; the tested recommendation engine and provider integrations
remain behind the versioned Python/FastAPI API in `waiver-ops`.

## Local development

1. Start the FastAPI service from the sibling `waiver_priority` project:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn waiver_api.main:app --reload --port 8000
   ```

2. From this repository, install dependencies and start Next.js:

   ```powershell
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000`.

Next.js uses `http://127.0.0.1:8000` automatically in development. Copy
`.env.example` to `.env.local` only when the API runs elsewhere.

Local development intentionally uses the FastAPI development identity, so an
Auth0 account is not required to work on the product UI.

## Hosted authentication

Auth0 is the initial OIDC provider. It owns sign-in only; FastAPI still resolves
the internal user, enforces tenant authorization, and owns the application
session. Next.js performs the ID-token exchange server-side, and neither the
Auth0 token nor the FastAPI session is exposed to browser JavaScript.

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
```

## Deployment status

This repository is not yet deployed. Streamlit remains the production UI until
authentication, recommendation parity, observability, and rollback checks are
complete.
