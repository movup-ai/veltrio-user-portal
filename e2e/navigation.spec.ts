import { expect, test } from '@playwright/test'

/**
 * Suspended by the move to Clerk: these specs used to satisfy the auth gate by
 * seeding a token into localStorage, which Clerk-issued sessions cannot be faked
 * with. Restoring them needs @clerk/testing plus a test user that exists in both
 * Clerk and the backend, so the suite can no longer run frontend-only.
 */
test.skip(true, 'Needs a real Clerk session - see the note above.')

test('navigates between primary modules via the sidebar', async ({ page }) => {
  await page.goto('/app/dashboard')

  await page.getByRole('link', { name: 'Vehicles' }).click()
  await expect(page).toHaveURL(/\/app\/vehicles$/)
  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible()

  await page.getByRole('link', { name: 'Bookings' }).click()
  await expect(page).toHaveURL(/\/app\/bookings$/)
  await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible()

  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard$/)
})
