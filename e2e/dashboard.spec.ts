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

  // The page title is a greeting, not the nav label — match on the name it addresses.
  await expect(page.getByRole('heading', { name: /Diego/ })).toBeVisible()
  // As a heading, not plain text — the sidebar has a "Revenue" section label too.
  await expect(page.getByRole('heading', { name: 'Revenue' })).toBeVisible()
  await expect(page.getByText('Fleet utilization')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fleet status' })).toBeVisible()
})
