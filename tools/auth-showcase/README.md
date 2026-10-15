# Auth showcase screenshots

Marketing images for the sign-up and onboarding screens, captured from the real pages with
invented data: **Sunstate Car Co.**, a five-car rental company on Miami Beach, on Tuesday
13 October 2026 at 10:30 (America/New_York).

## Regenerate

From the user portal root:

```
node tools/auth-showcase/capture.mjs
```

The script starts three servers, captures, then stops them (about 40 seconds). It writes 21 JPEGs
to `src/assets/auth-showcase/` and lists anything it found wrong: unmocked requests, broken
images, spinners, "undefined" or "NaN" on the page. It exits non-zero if it found anything.
Set `SHOWCASE_VERBOSE=1` to see the servers' logs.

It needs the customer portal checked out next to this repo (`../veltrio-customer-portal`) with
its `node_modules` installed, and ports 5199, 4100 and 3100 free.

## What is in here

| Path                  | What it is                                                                                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/sunstate.ts`  | The company, branch, fleet (Unsplash photos), renters and the pinned "today".                                                                                                                             |
| `shared/clock.ts`     | Pins `Date` to that moment; used by the harness and injected into the booking site.                                                                                                                       |
| `portal/`             | A Vite page that renders the real `DashboardLayout` and pages with the API objects mocked (`mocks.ts`, `fixtures.ts`) and Clerk stubbed (`clerk-stub.tsx`). Own cache dir: `node_modules/.vite-showcase`. |
| `mock-api/server.mjs` | The marketplace endpoints the booking site's company, vehicle, signing and payment pages read, on port 4100.                                                                                              |
| `capture.mjs`         | Starts everything, captures with Playwright (1440×900 at 2×, light theme), stops everything.                                                                                                              |
| `tsconfig.json`       | Typechecks the harness against the app's real types: `npx tsc -p tools/auth-showcase/tsconfig.json`.                                                                                                      |

## Outputs

`dashboard`, `calendar`, `vehicles` and `booking` are captured in `en` and `es`, as the page beside
the sidebar at 16:10, with `-detail` crops (the KPI row, the first two calendar rows, the payment
card) and `booking-checks` (the renter's checklist). The booking site has no Spanish version, so
its captures are English only: `site` (the company page), `site-detail` (a fleet card),
`vehicle-detail` (the R8's booking panel with dates picked), `sign-detail` (the renter signing
BK-20431) and `pay-detail` (that booking's payment summary; the card form is Stripe's, so it is
left out).

`AuthShowcase` rotates dashboard, site, calendar and booking on sign-in and sign-up. Each
onboarding step lays its screens out together: the site for the company step, vehicles with the
checks and calendar for the plan step, the booking with the signing and payment pages for the
ready step.

## Things to know

- `next dev` appends an "agent rules" block to the customer portal's `CLAUDE.md` when it sees an
  AI agent's environment variables. The script strips those variables from Next's environment and
  puts `CLAUDE.md`/`AGENTS.md` back byte for byte afterwards if anything changed them anyway.
- Next runs without `-H`: bound to `127.0.0.1` it turned the subdomain rewrite into a redirect loop.
- The dashboard page renders its own static mock data (Diego, the KPI figures, the bookings table),
  so it is captured as it is.
- The harness is not the real app: there is no Clerk session and no API behind it.
