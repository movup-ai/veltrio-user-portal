import { expect, test } from '@playwright/test'

/**
 * Suspended by the move to Clerk: these specs used to satisfy the auth gate by
 * seeding a token into localStorage, which Clerk-issued sessions cannot be faked
 * with. Restoring them needs @clerk/testing plus a test user that exists in both
 * Clerk and the backend, so the suite can no longer run frontend-only.
 */
test.skip(true, 'Needs a real Clerk session - see the note above.')

test('lists vehicles and filters by search', async ({ page }) => {
  await page.goto('/app/vehicles')

  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible()
  await expect(page.getByText('BMW X5')).toBeVisible()

  await page.getByPlaceholder('Search make, model, plate or VIN').fill('Tesla')
  await expect(page.getByText('Tesla Model 3')).toBeVisible()
  await expect(page.getByText('BMW X5')).not.toBeVisible()
})
