# BettingApp

React + TypeScript frontend for the Wallet & Bets service. Built with Vite, Tailwind CSS v4,
TanStack Query, and React Router.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A running Wallet & Bets API, or access to the deployed API

## Local development

Install dependencies and start the frontend:

```powershell
npm ci
npm run dev
```

Vite serves the app at `http://localhost:5173` and proxies `/api` requests to
`http://localhost:5103` by default. To use another local API address:

```powershell
$env:API_TARGET = "http://localhost:8080"
npm run dev
```

The proxy removes the `/api` prefix before forwarding requests. For example, frontend
`/api/events` requests reach the API at `/events`.

## Production API configuration

When the deployed frontend and API use different origins, configure
`VITE_API_BASE_URL` at build time or in the hosting provider's build environment. For the
deployed API, the value is:

```text
https://wallet-and-bet-settlement-service.onrender.com
```

The frontend then sends requests directly to that API origin. The API must allow the
frontend's origin through its CORS configuration. Alternatively, configure a hosting rewrite
so API requests go through the frontend's origin and leave `VITE_API_BASE_URL` unset.

`VITE_API_BASE_URL` is public client configuration, not a place for secrets. Never put
JWT signing keys, webhook secrets, or other credentials in frontend environment variables.

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm test` | Run unit and component tests with Vitest |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint the frontend with oxlint |

## Features

- User login and role-aware navigation
- Wallet balance, simulated wallet deposits and withdrawals, and transaction history
- Event browsing, bet placement, and personal bet history
- Admin overview with user, event, bet, deposit, and wallet-balance totals
- Admin event creation, closing, settlement, and voiding
- Admin user search and role filtering
- Paginated audit log with action, entity, and actor filters
- Provider deposit and webhook delivery views with status and event filters

Admin data is loaded from the API's Admin-authorized read endpoints. Provider deposits and
webhook deliveries are created by the signed provider webhook flow; the user's simulated
wallet deposit flow is separate and does not create provider webhook records.

## Project structure

```text
src/
  api/          Fetch client, token storage, API types, and per-area API modules
  auth/         JWT claim decoding, AuthProvider, and route guards
  components/   Shared UI and admin-specific components
  layouts/      App shell and role-specific navigation
  lib/          Money formatting, errors, idempotency, and shared utilities
  pages/        User pages and admin console pages
  test/         Vitest setup, helpers, fixtures, and API mocks
```

## Frontend conventions

- Money values use integer minor units; 100 represents 1.00 ETB.
- The API is authoritative for permissions. Client-side role checks only control navigation
  and screen access.
- Mutating user actions use an idempotency key per intent where supported by the API.
- API errors are mapped from the server's stable error codes in one shared helper.
- The access token is stored in `sessionStorage` and cleared on sign-out, expiry, or an API
  `401` response.
