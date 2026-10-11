import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Customer } from '../types/customer.types'

const merge = vi.fn()

vi.mock('../hooks/use-customers', () => ({
  useMergeCustomers: () => ({ mutate: merge, isPending: false }),
}))

const { MergeCustomerDialog } = await import('./MergeCustomerDialog')

function customer(id: string, name: string): Customer {
  return {
    id,
    name,
    email: `${id}@example.com`,
    phone: '+1 305 442 0118',
    dateOfBirth: '1991-04-17',
    licenceNumber: 'FL D-1204-889',
  }
}

const KEVIN = customer('kevin', 'Kevin Ragira')
const EDWARD = customer('edward', 'Edward Thomas')
const TIMUR = customer('timur', 'Timur Babaev')
const TOMASZ = customer('tomasz', 'Tomasz Quan')

const noop = () => {}

describe('MergeCustomerDialog', () => {
  beforeEach(() => merge.mockReset())

  it('keeps the customer whose page it is, by default', async () => {
    const user = userEvent.setup({ delay: null })
    render(<MergeCustomerDialog customer={KEVIN} duplicate={EDWARD} onClose={noop} onMerged={noop} />)

    await user.click(screen.getByRole('button', { name: 'Merge customers' }))

    expect(merge).toHaveBeenCalledWith({ targetId: 'kevin', sourceId: 'edward' }, expect.anything())
  })

  it('keeps the other record when that is the one picked', async () => {
    const user = userEvent.setup({ delay: null })
    render(<MergeCustomerDialog customer={KEVIN} duplicate={EDWARD} onClose={noop} onMerged={noop} />)

    await user.click(screen.getByRole('radio', { name: /Edward Thomas/ }))
    await user.click(screen.getByRole('button', { name: 'Merge customers' }))

    expect(merge).toHaveBeenCalledWith({ targetId: 'edward', sourceId: 'kevin' }, expect.anything())
  })

  it('never merges into a customer from the page that was open before', async () => {
    // The page reuses this dialog as staff move between customers. A choice remembered as
    // an id would still name Kevin here, and merge Timur into him with neither box picked.
    const user = userEvent.setup({ delay: null })
    const { rerender } = render(
      <MergeCustomerDialog customer={KEVIN} duplicate={undefined} onClose={noop} onMerged={noop} />,
    )
    rerender(<MergeCustomerDialog customer={TIMUR} duplicate={TOMASZ} onClose={noop} onMerged={noop} />)

    expect(screen.getByRole('radio', { name: /Timur Babaev/ })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Merge customers' }))

    expect(merge).toHaveBeenCalledWith({ targetId: 'timur', sourceId: 'tomasz' }, expect.anything())
  })
})
