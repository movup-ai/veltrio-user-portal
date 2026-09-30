import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { RecordTable } from './RecordTable'

function renderTable(pagination: { page: number; pageSize: number; total: number }, pageNote?: string) {
  const onPageChange = vi.fn()
  const onPageSizeChange = vi.fn()
  render(
    <RecordTable
      columns={[{ label: 'Name', align: 'left' }]}
      rows={[{ key: 'r1', cells: [{ kind: 'text', primary: 'Row' }] }]}
      pageNote={pageNote}
      pagination={{ ...pagination, onPageChange, onPageSizeChange }}
    />,
  )
  return { onPageChange, onPageSizeChange }
}

describe('the shared table footer', () => {
  it('states the range shown, the same way on every list', () => {
    // Bookings said "Showing 10 of 43", vehicles "Showing 1–8 of 20" and the log "Page 1 of 1".
    renderTable({ page: 2, pageSize: 10, total: 43 })

    expect(screen.getByText('Showing 11–20 of 43')).toBeInTheDocument()
  })

  it('stops at the last page', () => {
    renderTable({ page: 5, pageSize: 10, total: 43 })

    expect(screen.getByText('Showing 41–43 of 43')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
  })

  it('lets a page say something the range cannot, such as an empty result', () => {
    renderTable({ page: 1, pageSize: 10, total: 0 }, 'No bookings found')

    expect(screen.getByText('No bookings found')).toBeInTheDocument()
  })

  it('starts a new page size from the first page', async () => {
    const user = userEvent.setup()
    const { onPageChange, onPageSizeChange } = renderTable({ page: 4, pageSize: 10, total: 200 })

    await user.click(screen.getByRole('combobox', { name: 'Rows per page' }))
    await user.click(await screen.findByRole('option', { name: '50' }))

    expect(onPageSizeChange).toHaveBeenCalledWith(50)
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
