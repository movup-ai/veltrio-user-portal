import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { BookingManagePanel } from './BookingManagePanel'

describe('BookingManagePanel', () => {
  it('opens a row that can be used', async () => {
    const onAction = vi.fn()
    const user = userEvent.setup({ delay: null })
    render(<BookingManagePanel onAction={onAction} />)

    await user.click(screen.getByRole('button', { name: /Extend rental/ }))

    expect(onAction).toHaveBeenCalledWith('extend')
  })

  it('turns a row off and says why in place of what it does', async () => {
    const onAction = vi.fn()
    const user = userEvent.setup({ delay: null })
    render(
      <BookingManagePanel
        unavailable={{ extend: { reason: 'An extension is already waiting to be paid.' } }}
        onAction={onAction}
      />,
    )

    const row = screen.getByRole('button', { name: /Extend rental/ })
    expect(row).toBeDisabled()
    expect(row).toHaveTextContent('An extension is already waiting to be paid.')
    expect(row).not.toHaveTextContent('Push the return date back')
    await user.click(row)

    expect(onAction).not.toHaveBeenCalled()
    // The others are untouched.
    expect(screen.getByRole('button', { name: /Modify dates/ })).toBeEnabled()
  })
})
