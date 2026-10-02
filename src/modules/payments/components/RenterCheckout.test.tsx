import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'

const confirmPayment = vi.fn()
const loadStripe = vi.fn((key: string, options: { stripeAccount: string }) =>
  Promise.resolve({ key, options }),
)

vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_platform')

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: (key: string, options: { stripeAccount: string }) => loadStripe(key, options),
}))

vi.mock('@stripe/react-stripe-js', async () => {
  const { useState } = await import('react')
  return {
    // Like Stripe's: the intent it mounts with is the one it keeps.
    Elements: ({ options, children }: { options: { clientSecret: string }; children: React.ReactNode }) => {
      const [secret] = useState(options.clientSecret)
      return (
        <div data-testid="elements" data-secret={secret}>
          {children}
        </div>
      )
    },
    PaymentElement: () => <div>payment element</div>,
    useStripe: () => ({ confirmPayment }),
    useElements: () => ({}),
  }
})

const { RenterCheckout } = await import('./RenterCheckout')

function renderCheckout(props: { depositSecret?: string; onSettled?: (error?: string) => void } = {}) {
  return render(
    <RenterCheckout
      stripeAccountId="acct_company"
      clientSecret="pi_1_secret"
      submitLabel="Pay $319"
      consent="Sunstate Car Co. holds $2,000 on this card."
      onSettled={vi.fn()}
      {...props}
    />,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('RenterCheckout', () => {
  it('gives the deposit a Stripe form of its own once the rental is paid', () => {
    // The page swaps the paid rental's secret for the deposit's in the same place.
    const { rerender } = renderCheckout()
    rerender(
      <RenterCheckout
        stripeAccountId="acct_company"
        clientSecret="pi_2_secret"
        submitLabel="Authorise $2,000 hold"
        onSettled={vi.fn()}
      />,
    )

    expect(screen.getByTestId('elements')).toHaveAttribute('data-secret', 'pi_2_secret')
  })

  it("loads Stripe.js on the company's own account, with the consent above the button", () => {
    renderCheckout()

    expect(loadStripe).toHaveBeenCalledWith('pk_test_platform', { stripeAccount: 'acct_company' })
    expect(screen.getByText('Sunstate Car Co. holds $2,000 on this card.')).toBeInTheDocument()
  })

  it('reads the payment back once Stripe takes it', async () => {
    confirmPayment.mockResolvedValue({ paymentIntent: { status: 'succeeded', payment_method: 'pm_1' } })
    const onSettled = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderCheckout({ onSettled })

    await user.click(screen.getByRole('button', { name: 'Pay $319' }))

    await waitFor(() => expect(onSettled).toHaveBeenCalledWith())
    expect(confirmPayment).toHaveBeenCalledOnce()
    expect(confirmPayment).toHaveBeenCalledWith(expect.objectContaining({ redirect: 'if_required' }))
  })

  it('holds the deposit on the card just paid with, without asking for it again', async () => {
    confirmPayment
      .mockResolvedValueOnce({ paymentIntent: { status: 'succeeded', payment_method: 'pm_1' } })
      .mockResolvedValueOnce({ paymentIntent: { status: 'requires_capture' } })
    const onSettled = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderCheckout({ depositSecret: 'pi_2_secret', onSettled })

    await user.click(screen.getByRole('button', { name: 'Pay $319' }))

    await waitFor(() => expect(onSettled).toHaveBeenCalledWith(undefined))
    expect(confirmPayment).toHaveBeenLastCalledWith({
      clientSecret: 'pi_2_secret',
      confirmParams: { payment_method: 'pm_1', return_url: window.location.href },
      redirect: 'if_required',
    })
  })

  it('reports a deposit the bank turned down after the payment went through', async () => {
    confirmPayment
      .mockResolvedValueOnce({ paymentIntent: { status: 'succeeded', payment_method: { id: 'pm_1' } } })
      .mockResolvedValueOnce({ error: { message: 'Insufficient funds.' } })
    const onSettled = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderCheckout({ depositSecret: 'pi_2_secret', onSettled })

    await user.click(screen.getByRole('button', { name: 'Pay $319' }))

    // The page reloads the link and shows the deposit on its own, with this reason.
    await waitFor(() => expect(onSettled).toHaveBeenCalledWith('Insufficient funds.'))
  })

  it("shows the bank's reason when the card is declined, and stays on the form", async () => {
    confirmPayment.mockResolvedValue({ error: { message: 'Your card was declined.' } })
    const onSettled = vi.fn()
    const user = userEvent.setup({ delay: null })
    renderCheckout({ depositSecret: 'pi_2_secret', onSettled })

    await user.click(screen.getByRole('button', { name: 'Pay $319' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Your card was declined.')
    expect(onSettled).not.toHaveBeenCalled()
    expect(confirmPayment).toHaveBeenCalledOnce()
  })
})
