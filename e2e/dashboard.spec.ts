import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // The FastAPI backend isn't available in this environment, so we seed a
  // token directly to satisfy the auth gate and exercise the dashboard
  // against its dev mock fixtures (see VITE_USE_MOCKS in .env.example).
  await page.addInitScript(() => {
    window.localStorage.setItem('veltrio.access_token', 'e2e-fake-token')
  })
})

test('loads the dashboard with KPIs and charts', async ({ page }) => {
  await page.goto('/app/dashboard')

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Revenue', { exact: true })).toBeVisible()
  await expect(page.getByText('Fleet utilization')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Upcoming bookings' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fleet status' })).toBeVisible()
})
