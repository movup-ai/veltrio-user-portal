import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Customer } from '../types/customer.types'

vi.mock('../hooks/use-customers', () => ({
  useSaveCustomer: () => ({ mutate: vi.fn(), isPending: false }),
  useCustomerMatches: () => ({ data: [] }),
}))

const { CustomerFormDialog } = await import('./CustomerFormDialog')

const MARISOL: Customer = {
  id: 'c1',
  name: 'Marisol Vega',
  email: 'marisol@example.com',
  phone: '+1 305 442 0118',
  gender: 'female',
  dateOfBirth: '1991-04-17',
  address: '18 Ocean Drive, Miami FL 33139',
  licenceNumber: 'FL D-1204-889',
}

const dialog = (customer: Customer) => <CustomerFormDialog customer={customer} open onOpenChange={() => {}} />

describe('CustomerFormDialog', () => {
  it('keeps what is being typed when the customer is fetched again behind it', async () => {
    const user = userEvent.setup({ delay: null })
    const { rerender } = render(dialog(MARISOL), { wrapper: MemoryRouter })

    const name = screen.getByLabelText(/full name/i)
    await user.clear(name)
    await user.type(name, 'Marisol Vega-Ruiz')

    // A refetch (the window regaining focus, a colleague's edit) hands the page a new
    // object for the same customer. It must not replace a form somebody is filling in.
    rerender(dialog({ ...MARISOL, phone: '+1 305 000 0000' }))

    expect(screen.getByLabelText(/full name/i)).toHaveValue('Marisol Vega-Ruiz')
  })

  it('starts from the other customer when the page moves on to one', () => {
    const { rerender } = render(dialog(MARISOL), { wrapper: MemoryRouter })

    rerender(dialog({ ...MARISOL, id: 'c2', name: 'Ana Prieto' }))

    expect(screen.getByLabelText(/full name/i)).toHaveValue('Ana Prieto')
  })
})
