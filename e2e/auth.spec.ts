import { expect, test } from '@playwright/test'

test('redirects unauthenticated users from a protected route to login', async ({ page }) => {
  await page.goto('/app/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Sign in to Veltrio')).toBeVisible()
})

test('offers sign-up from the login screen', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Sign up' }).click()

  await expect(page).toHaveURL(/\/sign-up$/)
  await expect(page.getByText('Create your account')).toBeVisible()
})

test('sends an unauthenticated visitor away from onboarding', async ({ page }) => {
  await page.goto('/onboarding')
  await expect(page).toHaveURL(/\/login$/)
})
