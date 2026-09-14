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

Multi-tenancy and permissions are modeled from the start (`state/organization.store.ts`, `utils/permissions.ts`, `components/feedback/Can.tsx`) — frontend permission checks are UX only, the backend is the actual authorization boundary.
