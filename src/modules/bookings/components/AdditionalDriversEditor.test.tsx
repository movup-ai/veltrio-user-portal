import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AdditionalDriversEditor } from './AdditionalDriversEditor'
import type { AdditionalDriverValues } from '../schema/booking.schema'

const DRIVER: AdditionalDriverValues = { id: 'd1', name: '', licenceNumber: '', pricePerDay: 12 }

/** Shape RHF hands down for a row whose name and licence failed the schema. */
const ERRORS = [
  {
    name: { type: 'too_small', message: "Enter the driver's name" },
    licenceNumber: { type: 'too_small', message: 'Enter a licence number' },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any

describe('AdditionalDriversEditor', () => {
  it('stays quiet when a row is added, before anything is touched', () => {
    render(<AdditionalDriversEditor value={[DRIVER]} onChange={vi.fn()} errors={ERRORS} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a field its error once that field is blurred, and only that one', async () => {
    const user = userEvent.setup()
    render(<AdditionalDriversEditor value={[DRIVER]} onChange={vi.fn()} errors={ERRORS} />)

    // i18n is not initialized here, so labels render as their keys rather than English.
    await user.click(screen.getByLabelText('form.drivers.nameFor'))
    await user.tab()

    expect(screen.getByRole('alert')).toHaveTextContent("Enter the driver's name")
    expect(screen.queryByText('Enter a licence number')).not.toBeInTheDocument()
  })

  it('reveals every remaining error once the step is submitted', () => {
    render(
      <AdditionalDriversEditor value={[DRIVER]} onChange={vi.fn()} errors={ERRORS} showAllErrors />,
    )

    const messages = screen.getAllByRole('alert').map((n) => n.textContent)
    expect(messages).toEqual(["Enter the driver's name", 'Enter a licence number'])
  })
})
