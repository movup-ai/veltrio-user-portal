import { useState } from 'react'
import { Lock, ReceiptText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/i18n'
import { CompanyBadge, PublicNotice, PublicPanel, TripCard } from '@/modules/payments/components/PublicPage'
import { RenterCheckout } from '@/modules/payments/components/RenterCheckout'
import { usePublicPayment } from '@/modules/payments/hooks/use-booking-payments'
import type { PublicPayment } from '@/modules/payments/types/booking-payment.types'
import { linkIsGone, receiptLinkUrl } from '@/modules/payments/utils/booking-payment.utils'

/**
 * Where the renter pays, from the link the counter sent: the rental, the deposit hold, or both
 * on one card. Needs no login: the token in the link is the proof. Every load reads the link back
 * from Stripe, so returning from a bank's confirmation or reopening the link shows where it stands.
 */
export function PaymentPage() {
  const { t } = useTranslation('payments')
  const { tenantId = '', token = '' } = useParams()
  const { data: payment, isLoading, error, refetch, isRefetching } = usePublicPayment(tenantId, token)
  // A deposit the bank turned down after the payment went through, shown on the deposit form.
  const [depositError, setDepositError] = useState<string>()

  if (isLoading) return <LoadingState />
  if (!payment) {
    if (error && !linkIsGone(error)) {
      return (
        <PublicPanel>
          <PublicNotice icon="clock" title={t('pay.unreachable.title')} body={t('pay.unreachable.body')} />
          <Button type="button" loading={isRefetching} onClick={() => void refetch()} className="w-full">
            {t('pay.unreachable.retry')}
          </Button>
        </PublicPanel>
      )
    }
    return (
      <PublicPanel>
        <PublicNotice icon="alert" title={t('pay.invalid.title')} body={t('pay.invalid.body')} />
      </PublicPanel>
    )
  }

  return (
    <div className="flex w-full max-w-[480px] flex-col gap-3">
      <PublicPanel>
        <Company payment={payment} />
        <TripCard trip={payment} />
        <Amounts payment={payment} />
        <Status
          payment={payment}
          depositError={depositError}
          onSettled={(error) => {
            setDepositError(error)
            void refetch()
          }}
        />
      </PublicPanel>
      <p className="text-fg-4 m-0 flex items-center justify-center gap-1.5 text-[12px]">
        <Lock className="size-3.5" aria-hidden />
        {t('pay.secure')}
      </p>
    </div>
  )
}

function Company({ payment }: { payment: PublicPayment }) {
  const { t } = useTranslation('payments')
  return (
    <div className="flex flex-col gap-4">
      <CompanyBadge companyName={payment.companyName} reference={payment.reference} />
      <div>
        <h1 className="text-section-title m-0">{payment.charge ? t('pay.title') : t('pay.depositTitle')}</h1>
        <p className="text-description m-0 mt-0.5">
          {t(payment.charge ? 'pay.greeting' : 'pay.depositGreeting', {
            name: payment.renterName.split(/\s+/)[0],
          })}
        </p>
      </div>
    </div>
  )
}

/** What the link asks for. A deposit is held, never charged, so it is never added to the total. */
function Amounts({ payment }: { payment: PublicPayment }) {
  const { t } = useTranslation('payments')
  const format = useFormatters()
  const money = (amount: number) => format.currency(amount, payment.currency)
  const { charge, deposit } = payment

  return (
    <div className="flex flex-col gap-2">
      {charge && (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[14px] font-semibold">{t('pay.amountDue')}</span>
          <span className="text-[26px] leading-none font-bold tabular-nums">{money(charge.amount)}</span>
        </div>
      )}
      {deposit && (
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex flex-col">
            <span className={charge ? 'text-fg-2 text-[13px]' : 'text-[14px] font-semibold'}>
              {t('pay.depositHold')}
            </span>
            <span className="text-fg-4 text-[12px]">{t('pay.depositNotCharged')}</span>
          </span>
          <span
            className={
              charge
                ? 'text-[15px] font-semibold tabular-nums'
                : 'text-[26px] leading-none font-bold tabular-nums'
            }
          >
            {money(deposit.amount)}
          </span>
        </div>
      )}
    </div>
  )
}

function Status({
  payment,
  depositError,
  onSettled,
}: {
  payment: PublicPayment
  depositError?: string
  onSettled: (error?: string) => void
}) {
  const { t } = useTranslation('payments')
  const format = useFormatters()
  const { charge, deposit, stripeAccountId } = payment
  const money = (amount: number) => format.currency(amount, payment.currency)
  const values = {
    company: payment.companyName,
    reference: payment.reference,
    amount: money(charge?.amount ?? 0),
    deposit: money(deposit?.amount ?? payment.depositAmount),
  }
  const depositOpen = deposit?.status === 'open' && deposit.clientSecret ? deposit.clientSecret : undefined

  if (charge?.status === 'open' && charge.clientSecret && stripeAccountId) {
    return (
      <RenterCheckout
        stripeAccountId={stripeAccountId}
        clientSecret={charge.clientSecret}
        depositSecret={depositOpen}
        submitLabel={depositOpen ? t('pay.submitWithDeposit', values) : t('pay.submit', values)}
        consent={depositOpen ? t('pay.consentWithDeposit', values) : undefined}
        onSettled={onSettled}
      />
    )
  }
  if (charge?.status === 'processing' || deposit?.status === 'processing') {
    return <PublicNotice icon="clock" title={t('pay.processing.title')} body={t('pay.processing.body')} />
  }
  if (depositOpen && stripeAccountId) {
    return (
      <RenterCheckout
        stripeAccountId={stripeAccountId}
        clientSecret={depositOpen}
        submitLabel={t('pay.submitDeposit', values)}
        consent={t('pay.consentDeposit', values)}
        initialError={depositError}
        onSettled={onSettled}
      />
    )
  }
  const paid = charge?.status === 'paid'
  const held = deposit?.status === 'held'
  // Once money is taken, the renter can keep a receipt for it from here.
  const receipt = payment.receipt && (
    <Button variant="outline" asChild className="gap-1.5">
      <a href={receiptLinkUrl(window.location.origin, payment.receipt)}>
        <ReceiptText className="size-4" aria-hidden />
        {t('pay.viewReceipt')}
      </a>
    </Button>
  )
  if (paid && held) {
    return (
      <>
        <PublicNotice icon="check" title={t('pay.done.title')} body={t('pay.done.body', values)} />
        {receipt}
      </>
    )
  }
  if (paid) {
    // A deposit the link did not ask for is asked for separately, nearer pickup.
    const body =
      payment.depositAmount > 0 ? t('pay.paid.bodyDepositLater', values) : t('pay.paid.body', values)
    return (
      <>
        <PublicNotice icon="check" title={t('pay.paid.title')} body={body} />
        {receipt}
      </>
    )
  }
  if (held) {
    return <PublicNotice icon="check" title={t('pay.held.title')} body={t('pay.held.body', values)} />
  }
  return <PublicNotice icon="alert" title={t('pay.closed.title')} body={t('pay.closed.body', values)} />
}
