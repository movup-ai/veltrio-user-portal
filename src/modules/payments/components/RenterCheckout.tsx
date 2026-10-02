import { useMemo, useState, type FormEvent } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe, type Appearance } from '@stripe/stripe-js'
import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
// The Payment Element renders in Stripe's own frame, so the app's font is loaded into it too.
const FONTS = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700' }]

/**
 * The app's own colours for Stripe's frame, read from the theme as it is now, so dark mode
 * carries over. Stripe takes literal colours, not CSS variables.
 */
function appearance(): Appearance {
  const css = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  const border = token('--veltrio-border', '#e7e5e4')
  return {
    theme: 'stripe',
    variables: {
      colorPrimary: token('--veltrio-primary', '#0f766e'),
      colorText: token('--veltrio-fg', '#1c1917'),
      colorTextSecondary: token('--veltrio-fg-3', '#78716c'),
      colorBackground: token('--veltrio-surface', '#ffffff'),
      colorDanger: token('--veltrio-error', '#b91c1c'),
      fontFamily: 'Manrope, Inter, system-ui, sans-serif',
      fontSizeBase: '14px',
      borderRadius: '9px',
    },
    rules: {
      '.Input': { borderColor: border, boxShadow: 'none' },
      '.Tab': { borderColor: border, boxShadow: 'none' },
    },
  }
}

interface RenterCheckoutProps {
  stripeAccountId: string
  /** The rental payment, or the deposit hold when that is all the link asks for. */
  clientSecret: string
  submitLabel: string
  consent?: string
  /** A deposit to authorise on the same card once the payment goes through. */
  depositSecret?: string
  /** Why the last attempt did not go through, carried across a reload of the page's state. */
  initialError?: string
  /** Called once Stripe has answered; the page reads the outcome back from the API. */
  onSettled: (error?: string) => void
}

/**
 * Stripe's Payment Element on the company's own account: cards, Apple Pay, Google Pay and Link,
 * as the company's payment settings allow. The card details go straight to Stripe and never
 * touch Veltrio.
 */
export function RenterCheckout({ stripeAccountId, clientSecret, ...form }: RenterCheckoutProps) {
  const { t } = useTranslation('payments')
  // One Stripe.js instance per account: the payment is a direct charge on the company's.
  const stripe = useMemo(
    () => (PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY, { stripeAccount: stripeAccountId }) : null),
    [stripeAccountId],
  )

  if (!stripe) return <p className="text-error m-0 text-[13px]">{t('pay.unavailable')}</p>

  return (
    // Keyed by the intent: Stripe cannot move a mounted form to another one, so the deposit after
    // a combined link's payment gets a form of its own rather than the paid rental's.
    <Elements
      key={clientSecret}
      stripe={stripe}
      options={{ clientSecret, appearance: appearance(), fonts: FONTS }}
    >
      <CheckoutForm {...form} />
    </Elements>
  )
}

function CheckoutForm({
  submitLabel,
  consent,
  depositSecret,
  initialError,
  onSettled,
}: Omit<RenterCheckoutProps, 'stripeAccountId' | 'clientSecret'>) {
  const { t } = useTranslation('payments')
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(initialError)

  async function pay(event: FormEvent) {
    event.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError(undefined)
    const returnUrl = window.location.href
    // Redirects only for methods that need it; a card or wallet answers here.
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    })
    if (result.error) {
      setSubmitting(false)
      setError(result.error.message ?? t('pay.failed'))
      return
    }
    const method = result.paymentIntent.payment_method
    const methodId = typeof method === 'string' ? method : method?.id
    if (depositSecret && methodId) {
      // The card just used, kept on the renter's customer by the payment: no second entry.
      const hold = await stripe.confirmPayment({
        clientSecret: depositSecret,
        confirmParams: { payment_method: methodId, return_url: returnUrl },
        redirect: 'if_required',
      })
      setSubmitting(false)
      onSettled(hold.error ? (hold.error.message ?? t('pay.depositFailed')) : undefined)
      return
    }
    setSubmitting(false)
    onSettled()
  }

  return (
    <form onSubmit={pay} className="flex flex-col gap-4">
      <PaymentElement />
      {error && (
        <p role="alert" className="text-error m-0 text-[13px]">
          {error}
        </p>
      )}
      {consent && (
        <p className="text-fg-4 m-0 text-[12px]" style={{ textWrap: 'pretty' }}>
          {consent}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        loading={submitting}
        disabled={!stripe || !elements}
        className="h-11 w-full text-[14px] font-semibold"
      >
        <Lock aria-hidden />
        {submitLabel}
      </Button>
    </form>
  )
}
