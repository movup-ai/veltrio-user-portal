import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { InsuranceLinkSession } from '../hooks/use-verification'
import { InsuranceLinkDialog } from './InsuranceLinkDialog'

const sendInsuranceLink = vi.fn()

vi.mock('../api/verification.api', () => ({
  verificationApi: {
    sendInsuranceLink: (...args: unknown[]) => sendInsuranceLink(...args),
  },
}))

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

const SESSION: InsuranceLinkSession = {
  verificationId: 'v1',
  link: 'https://ignition.axle.insure/?token=ign_1',
}

// null rather than undefined, which would fall back to the default session.
function renderDialog(session: InsuranceLinkSession | null = SESSION, canSend = true) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <InsuranceLinkDialog
        open
        onOpenChange={vi.fn()}
        session={session ?? undefined}
        renterName="Benjamin Wilson"
        defaultEmail="benjamin@example.com"
        defaultPhone="9179206267"
        canSend={canSend}
      />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  sendInsuranceLink.mockReset()
})

describe('sending the renter their insurance link', () => {
  it('waits for the session before offering a link', () => {
    renderDialog(null)

    expect(screen.getByText('Creating the link…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy link/i })).not.toBeInTheDocument()
  })

  it('offers only the link while the API cannot send it', () => {
    // Send email and Send text posted to an endpoint that does not exist yet, and failed.
    renderDialog(SESSION, false)

    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send email' })).not.toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  it('copies the session link', async () => {
    const user = userEvent.setup()
    renderDialog()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')

    await user.click(screen.getByRole('button', { name: /copy link/i }))

    expect(writeText).toHaveBeenCalledWith(SESSION.link)
    expect(await screen.findByRole('button', { name: /copied/i })).toBeInTheDocument()
  })

  it('emails the link to the renter’s address on file', async () => {
    const user = userEvent.setup()
    sendInsuranceLink.mockResolvedValue(undefined)
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Send email' }))

    await waitFor(() =>
      expect(sendInsuranceLink).toHaveBeenCalledWith('v1', {
        channel: 'email',
        to: 'benjamin@example.com',
      }),
    )
  })

  it('texts the link to a number the counter can correct', async () => {
    const user = userEvent.setup()
    sendInsuranceLink.mockResolvedValue(undefined)
    renderDialog()

    await user.click(screen.getByRole('tab', { name: 'Text message' }))
    const phone = screen.getByLabelText('Renter’s mobile number')
    await user.clear(phone)
    await user.type(phone, '+1 305 555 0100')
    await user.click(screen.getByRole('button', { name: 'Send text' }))

    await waitFor(() =>
      expect(sendInsuranceLink).toHaveBeenCalledWith('v1', { channel: 'sms', to: '+1 305 555 0100' }),
    )
  })
})
