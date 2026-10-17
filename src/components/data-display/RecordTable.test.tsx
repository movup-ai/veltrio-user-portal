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

  it('is left off an empty table, unless a later page came back empty', () => {
    const empty = (page: number) => (
      <RecordTable
        columns={[{ label: 'Name', align: 'left' }]}
        rows={[]}
        emptyState={<p>Nothing here</p>}
        pagination={{ page, pageSize: 10, total: 0, onPageChange: vi.fn(), onPageSizeChange: vi.fn() }}
      />
    )
    const { rerender } = render(empty(1))
    // Present but hidden, so the assertion is on visibility rather than on the DOM.
    expect(screen.getByRole('button', { name: 'Previous', hidden: true })).not.toBeVisible()

    rerender(empty(2))
    expect(screen.getByRole('button', { name: 'Previous' })).toBeVisible()
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

describe('clickable rows', () => {
  function renderClickable() {
    const onRowClick = vi.fn()
    const onAction = vi.fn()
    render(
      <RecordTable
        columns={[
          { label: 'Name', align: 'left' },
          { label: '', align: 'right' },
        ]}
        rows={[
          {
            key: 'r1',
            cells: [
              { kind: 'text', primary: 'First' },
              { kind: 'actions', items: [{ label: 'Open', onClick: onAction }] },
            ],
          },
        ]}
        onRowClick={onRowClick}
      />,
    )
    return { onRowClick, onAction, row: screen.getByText('First').closest('tr') as HTMLElement }
  }

  it.each([
    ['Enter', '{Enter}'],
    ['Space', ' '],
  ])('open from the keyboard with %s, as they do with a click', async (_, key) => {
    const user = userEvent.setup({ delay: null })
    const { onRowClick, row } = renderClickable()

    await user.tab()
    expect(row).toHaveFocus()
    await user.keyboard(key)

    expect(onRowClick).toHaveBeenCalledWith('r1')
  })

  it('leave Enter on the row menu to the menu', async () => {
    const user = userEvent.setup({ delay: null })
    const { onRowClick } = renderClickable()

    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Row actions' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('menuitem', { name: 'Open' })).toBeInTheDocument()
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('are not focusable when nothing happens on a click', () => {
    render(
      <RecordTable
        columns={[{ label: 'Name', align: 'left' }]}
        rows={[{ key: 'r1', cells: [{ kind: 'text', primary: 'Row' }] }]}
      />,
    )

    expect(screen.getByText('Row').closest('tr')).not.toHaveAttribute('tabindex')
  })
})
