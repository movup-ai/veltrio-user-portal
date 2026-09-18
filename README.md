# Veltrio User Portal

The rental company (owner) dashboard for Veltrio, a multi-tenant car-rental management platform. This is the frontend only — the API is a separate FastAPI + PostgreSQL service.

```text
React/Vite User Portal
        │
        │ HTTP API
        ▼
      FastAPI
        │
        ▼
    PostgreSQL
```

## Stack

React · TypeScript · Vite · React Router · TanStack Query · TanStack Table · React Hook Form + Zod · Zustand · Tailwind CSS v4 · shadcn/ui-style components (Radix primitives) · Recharts · Vitest + Testing Library · Playwright.

## Getting started

```bash
npm install
cp .env.example .env   # set VITE_API_URL once the FastAPI backend is available
npm run dev
```

By default `VITE_USE_MOCKS=true`, so every module serves local fixtures (`modules/*/mock/`) instead of calling the backend — the UI is fully explorable before any FastAPI endpoint exists. Flip a module to real data by setting `VITE_USE_MOCKS=false` once its endpoints land; each module's `*.api.ts` branches on this flag.

Authentication is the exception: it always runs for real, so Clerk must be configured and the backend reachable to get past the login screen.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, write mode |
| `npm test` | Vitest (unit/component tests, `src/**/*.test.tsx`) |
| `npm run test:e2e` | Playwright (`e2e/`) — starts the dev server automatically |

## Architecture

Domain-feature structure — see `src/`:

- `app/` — router, providers, layouts, root `App.tsx`
- `pages/` — route-level composition only, no business logic
- `modules/<domain>/` — api, components, hooks, schemas, types, mock fixtures per business domain (vehicles, bookings, customers, …)
- `components/` — cross-domain reusable UI (`ui/`, `layout/`, `navigation/`, `data-display/`, `forms/`, `feedback/`)
- `services/` — API client, auth, storage
- `state/` — Zustand stores for genuinely global client state (auth, active organization, UI prefs). Server data lives in TanStack Query, never here.
- `styles/` — design tokens (`tokens.css`), the Tailwind `@theme` mapping (`theme.css`), and global styles

The design system supports light and dark mode out of the box (`state/ui.store.ts` + `app/providers/ThemeProvider.tsx`); all tokens are defined once in `styles/tokens.css` and swap automatically via the `.dark` class.

## Authentication and onboarding

Identity lives in Clerk; tenancy lives in the backend. There is no login endpoint — the portal never sees a password.

Signing up is two steps, because the backend refuses to create a tenant until Clerk has verified the email:

1. `/sign-up` renders Clerk's `<SignUp />` — email, password, verification. `/login` renders `<SignIn />`.
2. `/onboarding` (`pages/auth/OnboardingPage.tsx`) collects the company: name, portal address, website, operating country, fleet size and time zone, then `POST /auth/register-tenant` creates the tenant and the owner membership. The portal address is slugged from the company name by `utils/slug.ts` (which mirrors the backend's rules) and stays in sync until you edit it by hand.
3. On success the user lands on `/app/dashboard`.

`ProtectedRoute` requires both a Clerk session and a `GET /auth/me` that resolves to a user with at least one membership; an account that stops after step 1 returns `user_not_onboarded` and is sent back to `/onboarding`. Every request carries a freshly minted Clerk session token (`services/auth/clerk-token.ts`) plus `X-Tenant-Id` for the active organization — tokens are short-lived and never persisted by us.

The backend grants a role per tenant — `owner`, `manager` or `staff` — not permission strings. `ROLE_PERMISSIONS` in `utils/permissions.ts` expands a role into the permissions the UI gates on.

`VITE_CLERK_PUBLISHABLE_KEY` must point at the same Clerk instance as the backend's `CLERK_ISSUER`, and the backend's `CLERK_AUTHORIZED_PARTIES` must contain this app's origin (`http://localhost:5173` in development).

Multi-tenancy and permissions are modeled from the start (`state/organization.store.ts`, `utils/permissions.ts`, `components/feedback/Can.tsx`) — frontend permission checks are UX only, the backend is the actual authorization boundary.
