import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('veltrio.access_token', 'e2e-fake-token')
  })
})

test('lists vehicles and filters by search', async ({ page }) => {
  await page.goto('/app/vehicles')

  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible()
  await expect(page.getByText('BMW X5')).toBeVisible()

  await page.getByPlaceholder('Search by make, model, or plate…').fill('Tesla')
  await expect(page.getByText('Tesla Model Y')).toBeVisible()
  await expect(page.getByText('BMW X5')).not.toBeVisible()
})
