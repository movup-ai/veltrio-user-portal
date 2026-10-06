import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { BookingRestoreAction } from './BookingRestoreAction'

const restore = vi.fn<(reference: string) => Promise<unknown>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

vi.mock('../api/booking.api', () => ({
  bookingApi: { restore: (reference: string) => restore(reference) },
}))

function renderAction() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <BookingRestoreAction reference="BK-10001" renterName="Marisol Vega" />
    </QueryClientProvider>,
  )
  return { invalidate, user: userEvent.setup({ delay: null }) }
}

describe('BookingRestoreAction', () => {
  beforeEach(() => {
    restore.mockReset()
    vi.mocked(toast).mockReset()
  })

  it('restores only after the dialog is confirmed, then reloads the booking', async () => {
    restore.mockResolvedValue({ booking: {}, renterNotified: true })
    const { invalidate, user } = renderAction()

    await user.click(screen.getByRole('button', { name: 'Restore reservation' }))
    // Restoring emails the renter, so the first click must not be the one that does it.
    expect(restore).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('BK-10001 goes back to Pending')

    await user.click(screen.getAllByRole('button', { name: 'Restore reservation' }).at(-1)!)

    await waitFor(() => expect(restore).toHaveBeenCalledWith('BK-10001'))
    await waitFor(() =>
      expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toContainEqual(['bookings']),
    )
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        description: 'Marisol Vega has been emailed that it is under review again.',
      }),
    )
  })

  it('warns that the renter was not told when the API could not email them', async () => {
    restore.mockResolvedValue({ booking: {}, renterNotified: false })
    const { user } = renderAction()

    await user.click(screen.getByRole('button', { name: 'Restore reservation' }))
    await screen.findByRole('dialog')
    await user.click(screen.getAllByRole('button', { name: 'Restore reservation' }).at(-1)!)

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Email isn't set up, so Marisol Vega was not told. Message them yourself.",
        }),
      ),
    )
  })
})
