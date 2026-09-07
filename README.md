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

## Architecture boundary

- Browser code never receives database credentials or provider tokens.
- `WAIVER_API_BASE_URL` is server-only; do not rename it with a
  `NEXT_PUBLIC_` prefix.
- FastAPI remains the authorization and business-logic boundary.
- Next.js route handlers may later adapt browser sessions, but they will not
  replace the Python recommendation engine.

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
