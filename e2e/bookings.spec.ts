import { expect, type Page, test } from '@playwright/test'

/**
 * Suspended by the move to Clerk: these specs used to satisfy the auth gate by
 * seeding a token into localStorage, which Clerk-issued sessions cannot be faked
 * with. Restoring them needs @clerk/testing plus a test user that exists in both
 * Clerk and the backend, so the suite can no longer run frontend-only.
 */
test.skip(true, 'Needs a real Clerk session - see the note above.')

/**
 * Seeded bookings are pinned to September of the current year (see booking.schedule.ts), so
 * November is reliably clear of every one of them whatever year the suite runs in. Four days,
 * to keep the expected totals stable.
 */
function clearWindow(): [string, string] {
  const year = new Date().getFullYear()
  return [`${year}-11-10`, `${year}-11-14`]
}

/**
 * Drives the DatePicker popover: opens the field, pages to the wanted month, clicks the day.
 * The month grid exposes `aria-label="September 2026"` and each day button its full date, so
 * this needs no test hooks of its own.
 */
async function pickDate(page: Page, fieldLabel: string, iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  const target = new Date(year, month - 1, 1)

  await page.getByLabel(fieldLabel, { exact: true }).click()
  const dialog = page.getByRole('dialog')
  const grid = dialog.getByRole('grid')

  for (let i = 0; i < 24; i += 1) {
    const shown = new Date(`1 ${await grid.getAttribute('aria-label')}`)
    if (shown.getFullYear() === target.getFullYear() && shown.getMonth() === target.getMonth()) break
    const direction = shown < target ? 'Go to the Next Month' : 'Go to the Previous Month'
    await dialog.getByRole('button', { name: direction }).click()
  }

  // Day buttons are named "Friday, September 18th, 2026" — match the tail, unanchored.
  const monthName = target.toLocaleString('en-US', { month: 'long' })
  await dialog.getByRole('button', { name: new RegExp(`${monthName} ${day}(st|nd|rd|th), ${year}`) }).click()
}

async function setWindow(page: Page, from: string, to: string) {
  await pickDate(page, 'Pickup date', from)
  await pickDate(page, 'Return date', to)
}


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

test('opens a booking from the list and shows its full record', async ({ page }) => {
  await page.goto('/app/bookings')
  await page.getByRole('cell').filter({ hasText: 'BK-48210' }).click()

  await expect(page).toHaveURL(/\/app\/bookings\/BK-48210$/)
  await expect(page.getByRole('heading', { name: 'BK-48210' })).toBeVisible()

  // Progress: BK-48210 is Confirmed, so two of the five stages are behind it.
  await expect(page.getByText('Stage 2 of 5')).toBeVisible()

  // Payment carries the itemization, billed at the vehicle's list rate and reconciling to the
  // total the list showed. The breakdown lives here and nowhere else.
  await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible()
  await expect(page.getByText('$189 × 4 days')).toBeVisible()
  await expect(page.getByText('$1,240').first()).toBeVisible()
  await expect(page.getByText('Paid', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Invoice' })).toBeVisible()
  await expect(page.getByText('Security deposit')).toBeVisible()

  // Renter and checklist render against the seeded customer.
  await expect(page.getByText('marisol.vega@hey.com')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Checklist' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Manage booking' })).toBeVisible()

  // The vehicle link is real — it goes to that car's page.
  await page.getByRole('button', { name: 'Open vehicle' }).click()
  await expect(page).toHaveURL(/\/app\/vehicles\/veh_1$/)
})

test('reorders the list from the sort control', async ({ page }) => {
  await page.goto('/app/bookings')

  const firstCustomer = page.getByRole('row').nth(1).getByRole('cell').first()

  // Newest first by default — Samir's BK-48228 is the last reference issued among the upcoming.
  await expect(firstCustomer).toContainText('Samir Qureshi')

  await page.getByRole('button', { name: 'Sort bookings' }).click()
  await page.getByRole('menuitem', { name: 'Total (high → low)' }).click()

  // Hélène's $1,673 is the largest of the upcoming bookings.
  await expect(firstCustomer).toContainText('Hélène Brassard')

  await page.getByRole('button', { name: 'Sort bookings' }).click()
  await page.getByRole('menuitem', { name: 'Oldest first' }).click()

  // Marisol's BK-48210 is the earliest reference in the set.
  await expect(firstCustomer).toContainText('Marisol Vega')
})

/**
 * Clicks one day inside an already-open calendar popover, paging until that month is on screen.
 * Unlike `pickDate` this copes with the two-month range grid, where the wanted month may be
 * either pane.
 */
async function pickDayInOpenCalendar(page: Page, iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  const target = new Date(year, month - 1, 1)
  const dialog = page.getByRole('dialog')
  const monthName = target.toLocaleString('en-US', { month: 'long' })
  const dayButton = dialog.getByRole('button', { name: new RegExp(`${monthName} ${day}(st|nd|rd|th), ${year}`) })

  for (let i = 0; i < 24 && (await dayButton.count()) === 0; i += 1) {
    const shown = new Date(`1 ${await dialog.getByRole('grid').first().getAttribute('aria-label')}`)
    const direction = shown < target ? 'Go to the Next Month' : 'Go to the Previous Month'
    await dialog.getByRole('button', { name: direction }).click()
  }

  await dayButton.first().click()
}

test('filters the list to bookings picked up inside a chosen date range', async ({ page }) => {
  const year = new Date().getFullYear()
  await page.goto('/app/bookings')

  // Six upcoming bookings start Sep 14; only Hélène and Samir start Sep 15.
  await expect(page.getByText('Marisol Vega')).toBeVisible()

  // One click is already a one-day range, but nothing is applied until Done.
  await page.getByRole('button', { name: /^Pickup Any dates$/ }).click()
  await pickDayInOpenCalendar(page, `${year}-09-15`)
  await expect(page.getByText('Marisol Vega')).toBeVisible()

  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('button', { name: /^Pickup Sep 15$/ })).toBeVisible()
  await expect(page.getByText('Hélène Brassard')).toBeVisible()
  await expect(page.getByText('Marisol Vega')).not.toBeVisible()

  // Extending the range back over the 14th brings the rest of the week in again.
  await page.getByRole('button', { name: /^Pickup Sep 15$/ }).click()
  await pickDayInOpenCalendar(page, `${year}-09-14`)
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('button', { name: /^Pickup Sep 14 – Sep 15$/ })).toBeVisible()
  await expect(page.getByText('Marisol Vega')).toBeVisible()

  // Clear needs no confirming — it drops the filter and closes.
  await page.getByRole('button', { name: /^Pickup Sep 14 – Sep 15$/ }).click()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByRole('button', { name: /^Pickup Any dates$/ })).toBeVisible()
  await expect(page.getByText('Caleb Onyango')).toBeVisible()
})

test('creates a booking and shows it at the top of the list', async ({ page }) => {
  await page.goto('/app/bookings/new')
  await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible()
  await expect(page.getByText('Step 1 of 4 · Trip')).toBeVisible()

  // Step 1 — trip. The step gate blocks an unanswered required field.
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Select a pickup location')).toBeVisible()

  await setWindow(page, ...clearWindow())
  await page.getByLabel('Pickup location').click()
  await page.getByRole('option', { name: 'Orlando Intl.' }).click()

  await expect(page.getByText('1 available')).toBeVisible()
  await page.getByRole('radio').first().click()
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 2 — picking a known customer prefills their contact details.
  await expect(page.getByText('Step 2 of 4 · Renter')).toBeVisible()
  await page.getByLabel('Find customer').click()
  await page.getByRole('button', { name: 'Marisol Vega' }).click()
  await expect(page.getByLabel('Email')).toHaveValue('marisol.vega@hey.com')
  await expect(page.getByLabel('Driving licence number')).toHaveValue('FL D-1204-889')
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 3 — rate defaults to Daily; name a second driver at a discounted rate, plus a one-off fee.
  await expect(page.getByText('Step 3 of 4 · Price')).toBeVisible()
  await page.getByRole('button', { name: 'Add driver' }).click()
  await page.getByLabel('Driver 1 full name').fill('Tomas Vega')
  await page.getByLabel('Driver 1 licence number').fill('FL D-9911-020')
  // Overrides the $12/day default — each driver's rate is independently editable.
  await page.getByLabel('Driver 1 daily rate').fill('10')

  await page.getByRole('button', { name: 'Add fee' }).click()
  await page.getByLabel('Fee 1 description').fill('Cleaning fee')
  await page.getByLabel('Fee 1 amount').fill('25')

  // The quote beside the form reacts as soon as both are entered.
  await expect(page.getByText('1 additional driver · 4 days')).toBeVisible()
  await expect(page.getByText('Cleaning fee', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 4 — (4 days x $145) + (4 days x $10 driver) + $25 cleaning fee = $645, x 7% tax = $690.15.
  await expect(page.getByText('Step 4 of 4 · Review')).toBeVisible()
  await expect(page.getByText('1 additional driver · 4 days')).toBeVisible()
  // Appears twice on Review: once in the itemized section, once in the price summary.
  await expect(page.getByText('Cleaning fee', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('$690.15')).toBeVisible()
  await page.getByRole('button', { name: 'Reserve booking' }).click()

  await expect(page).toHaveURL(/\/app\/bookings$/)
  await expect(page.getByRole('cell').filter({ hasText: 'BK-48230' })).toBeVisible()
})

test('blocks vehicles whose dates clash with an existing booking', async ({ page }) => {
  await page.goto('/app/bookings/new')
  await expect(page.getByRole('heading', { name: 'New booking' })).toBeVisible()

  const year = new Date().getFullYear()
  const jeep = page.getByRole('radio').filter({ hasText: 'Jeep Wrangler' })

  // Seeded booking BK-48214 holds the Jeep (FL·6TR-355) from Sep 14 to Sep 21.
  await setWindow(page, `${year}-09-18`, `${year}-09-20`)
  await expect(jeep).toBeDisabled()
  await expect(jeep).toContainText('Booked until')
  await expect(page.getByText('1 available')).toBeVisible()

  // Clear of that window, the same vehicle is bookable again.
  await setWindow(page, ...clearWindow())
  await expect(jeep).toBeEnabled()
  await expect(page.getByText('2 available')).toBeVisible()
})

test('keeps the customer lookup separate from the renter name', async ({ page }) => {
  await page.goto('/app/bookings/new')
  await page.getByLabel('Pickup location').click()
  await page.getByRole('option', { name: 'Tampa Downtown' }).click()
  await page.getByRole('radio').first().click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Step 2 of 4 · Renter')).toBeVisible()

  const lookup = page.getByLabel('Find customer')
  const fullName = page.getByLabel('Full name', { exact: true })

  // Typing a brand-new renter must not echo back into the lookup above it.
  await fullName.fill('Edward Nunez')
  await expect(fullName).toHaveValue('Edward Nunez')
  await expect(lookup).toHaveValue('')

  // Picking from the book fills both — the lookup shows what it is linked to.
  await lookup.click()
  await page.getByRole('button', { name: 'Marisol Vega' }).click()
  await expect(fullName).toHaveValue('Marisol Vega')
  await expect(lookup).toHaveValue('Marisol Vega')

  // Editing the name by hand breaks that link and clears the stale lookup.
  await fullName.fill('Marisol Vega-Ruiz')
  await expect(lookup).toHaveValue('')

  // New customer wipes the prefilled details.
  await lookup.click()
  await page.getByRole('button', { name: 'Marisol Vega' }).click()
  await expect(page.getByLabel('Email')).toHaveValue('marisol.vega@hey.com')
  await page.getByRole('button', { name: 'New customer' }).click()
  await expect(fullName).toHaveValue('')
  await expect(lookup).toHaveValue('')
  await expect(page.getByLabel('Email')).toHaveValue('')
})

test('picks a date of birth through the month and year dropdowns', async ({ page }) => {
  await page.goto('/app/bookings/new')
  await page.getByLabel('Pickup location').click()
  await page.getByRole('option', { name: 'Tampa Downtown' }).click()
  await page.getByRole('radio').first().click()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByLabel('Date of birth').click()
  const dialog = page.getByRole('dialog')

  // Two dropdowns and no duplicated month label beside them.
  await expect(dialog.getByRole('combobox')).toHaveCount(2)
  await expect(dialog.getByRole('grid')).toHaveAttribute('aria-label', /\d{4}$/)

  // Each select has to actually move the grid, not just render.
  await dialog.getByRole('combobox').nth(1).selectOption('1990')
  await dialog.getByRole('combobox').first().selectOption('5')
  await expect(dialog.getByRole('grid')).toHaveAttribute('aria-label', 'June 1990')

  await dialog.getByRole('button', { name: /June 12(st|nd|rd|th), 1990/ }).click()
  await expect(page.getByLabel('Date of birth')).toContainText('Jun 12, 1990')
})

test('saves a draft and restores it on return', async ({ page }) => {
  await page.goto('/app/bookings/new')

  await page.getByLabel('Pickup location').click()
  await page.getByRole('option', { name: 'Tampa Downtown' }).click()
  await page.getByRole('button', { name: 'Save draft' }).click()

  await expect(page).toHaveURL(/\/app\/bookings$/)
  await expect(page.getByText('Draft saved', { exact: true })).toBeVisible()

  // In-app navigation on purpose: a full page.goto() would re-run the init script and wipe the draft.
  await page.getByRole('button', { name: 'New booking' }).click()
  await expect(page.getByText('Draft restored', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Pickup location')).toContainText('Tampa Downtown')
})
