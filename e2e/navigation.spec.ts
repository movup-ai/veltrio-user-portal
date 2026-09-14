import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('veltrio.access_token', 'e2e-fake-token')
  })
})

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
