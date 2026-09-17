import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('veltrio.access_token', 'e2e-fake-token')
  })
})

test('filters the bookings list from the More filters popover', async ({ page }) => {
  await page.goto('/app/bookings')

  await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible()
  await expect(page.getByText('Marisol Vega')).toBeVisible()
  await expect(page.getByText('Caleb Onyango')).toBeVisible()

  await page.getByRole('button', { name: 'More filters' }).click()
  await page.getByText('$1,000+').click()
  await page.getByRole('button', { name: 'Apply filters' }).click()

  // Only the bookings over $1,000 survive; the $74 one is filtered out.
  await expect(page.getByText('Marisol Vega')).toBeVisible()
  await expect(page.getByText('Caleb Onyango')).not.toBeVisible()
})

test('creates a booking and shows it at the top of the list', async ({ page }) => {
  await page.goto('/app/bookings/new')
  await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible()

  // Step 1 — trip. The step gate blocks an unanswered required field.
  await page.getByRole('button', { name: 'Next step' }).click()
  await expect(page.getByText('Select a pickup location')).toBeVisible()

  await page.getByLabel('Pickup location').click()
  await page.getByRole('option', { name: 'Orlando Intl.' }).click()
  await page.getByRole('button', { name: 'Next step' }).click()

  // Step 2 — vehicle, rate (auto-selects Daily) and one extra.
  await expect(page.getByText('Available vehicles at Orlando Intl.')).toBeVisible()
  await page.getByRole('radio').first().click()
  await expect(page.getByText('Price breakdown')).toBeVisible()
  await page.getByRole('checkbox').first().click()
  await page.getByRole('button', { name: 'Next step' }).click()

  // Step 3 — picking a known customer prefills their contact details.
  await page.getByLabel('Customer', { exact: true }).click()
  await page.getByRole('button', { name: 'Priya Raman' }).click()
  await expect(page.getByLabel('Email')).toHaveValue('priya.raman@gmail.com')
  await page.getByRole('button', { name: 'Next step' }).click()

  // Step 4 — review, then create.
  await expect(page.getByText('Jeep Wrangler')).toBeVisible()
  await page.getByRole('button', { name: 'Create booking' }).click()

  await expect(page).toHaveURL(/\/app\/bookings$/)
  await expect(page.getByRole('cell').filter({ hasText: 'BK-48230' })).toBeVisible()
})
