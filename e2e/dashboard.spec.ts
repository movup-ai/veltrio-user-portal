import { expect, test } from '@playwright/test'

/**
 * Suspended by the move to Clerk: these specs used to satisfy the auth gate by
 * seeding a token into localStorage, which Clerk-issued sessions cannot be faked
 * with. Restoring them needs @clerk/testing plus a test user that exists in both
 * Clerk and the backend, so the suite can no longer run frontend-only.
 */
test.skip(true, 'Needs a real Clerk session - see the note above.')

test('loads the dashboard with KPIs and charts', async ({ page }) => {
  await page.goto('/app/dashboard')

  // The page title is a greeting, not the nav label — match on the name it addresses.
  await expect(page.getByRole('heading', { name: /Diego/ })).toBeVisible()
  // As a heading, not plain text — the sidebar has a "Revenue" section label too.
  await expect(page.getByRole('heading', { name: 'Revenue' })).toBeVisible()
  await expect(page.getByText('Fleet utilization')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fleet status' })).toBeVisible()
})
