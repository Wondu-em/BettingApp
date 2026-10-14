# Wallet & Bets: web frontend

React + TypeScript + Vite + Tailwind CSS v4 + TanStack Query + React Router.
It talks to the .NET API through a dev proxy (`/api` -> the API), so there is no CORS setup.

## Run

Requires Node.js 20.19+ (or 22.12+). Start the API first (default).

```powershell
cd web
npm install
npm run dev            # http://localhost:5173
```

API on another port: `$env:API_TARGET = "http://localhost:8080"; npm run dev`

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server with the `/api` proxy |
| `npm test` | unit and component tests (Vitest + Testing Library) |
| `npm run build` | type-check and production build into `dist/` |
| `npm run lint` | oxlint |

## Structure

```text
src/
  api/         client (fetch wrapper, ApiError), tokenStore, types, per-area API modules
  auth/        JWT decoding, AuthProvider/useAuth, route guards
  lib/         money (integer minor units), payout (mirrors server rounding), errors, idempotency
  components/  Pill, Card, Button, Field, ErrorBanner, PageHeader
  layouts/     AppShell (navy sidebar for users, brown for admins)
  pages/       Login, Forbidden, ComingSoon (placeholder), NotFound
  test/        setup and helpers (fake JWTs, render with providers)
```

## Rules this code follows

- **Money is integer minor units** (100 = 1.00 ETB). Amounts are parsed from text and never go through floats.
- **One Idempotency-Key per user intent.** Retrying the same attempt reuses the key; success or an edited amount rotates it (`useIdempotencyKey`).
- **The server is the authority.** The UI decodes the token only to pick screens; roles are re-checked on every request.
- **Errors are mapped from the API's stable `code`** in one place (`lib/errors.ts`).
- The token lives in `sessionStorage` and is cleared on sign-out, expiry or any 401.
