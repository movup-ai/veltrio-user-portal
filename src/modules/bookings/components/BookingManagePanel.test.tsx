import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
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

  it('turns cancelling off with what to do instead', async () => {
    const onAction = vi.fn()
    const user = userEvent.setup({ delay: null })
    render(
      <TooltipProvider delayDuration={0}>
        <BookingManagePanel
          unavailable={{ cancel: { reason: 'The vehicle is out: take it back to end the rental.' } }}
          onAction={onAction}
        />
      </TooltipProvider>,
    )

    const cancel = screen.getByRole('button', { name: 'Cancel booking' })
    expect(cancel).toBeDisabled()
    // Said on hover rather than under the button, so the card does not grow a line for it.
    expect(screen.queryByText('The vehicle is out: take it back to end the rental.')).not.toBeInTheDocument()
    await user.click(cancel)
    expect(onAction).not.toHaveBeenCalled()

    // The wrapper takes the hover: a disabled button fires none of its own.
    await user.hover(cancel.parentElement as HTMLElement)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'The vehicle is out: take it back to end the rental.',
    )
  })

  it('makes cancelling the red button on the card', () => {
    render(<BookingManagePanel onAction={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Cancel booking' })).toHaveClass('bg-error')
  })

  it('asks to cancel a booking that can be', async () => {
    const onAction = vi.fn()
    const user = userEvent.setup({ delay: null })
    render(<BookingManagePanel onAction={onAction} />)

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))

    expect(onAction).toHaveBeenCalledWith('cancel')
  })
})
