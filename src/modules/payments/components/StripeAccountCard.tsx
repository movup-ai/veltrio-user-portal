import { useEffect, useRef, useState } from 'react'
import { CircleDollarSign, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { usePermissions } from '@/components/feedback/Can'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useFormatters } from '@/i18n'
import { cn } from '@/lib/utils'
import { hasAnyPermission } from '@/utils/permissions'
import {
  CAPABILITY_DOT,
  NOTICE_ICON,
  STATE_TONE,
  STRIPE_DASHBOARD_URL,
  TONE_CLASS,
} from '../constants/payment.constants'
import {
  useDisconnectPaymentAccount,
  useEnablePaymentMethod,
  usePaymentAccount,
  usePaymentMethods,
  useReconnectPaymentAccount,
  useRefreshPaymentAccount,
  useStartNewAccount,
  useStartOnboarding,
} from '../hooks/use-payment-account'
import type { PaymentAccount, PaymentAccountState } from '../types/payment-account.types'
import { accountState } from '../utils/payment-account.utils'

/**
 * The company's Stripe account: connect it, finish Stripe's form, and see whether cards and
 * payouts are on. Stripe sends the owner back with `?stripe=return` (re-read the account) or
 * `?stripe=refresh` (the single-use link expired, so open a fresh one).
 */
export function StripeAccountCard() {
  const { t } = useTranslation('settings')
  const { data: account, isLoading, isError, refetch } = usePaymentAccount()
  const connect = useStartOnboarding()
  const refresh = useRefreshPaymentAccount()
  const [params, setParams] = useSearchParams()
  const handled = useRef(false)

  const returned = params.get('stripe')
  useEffect(() => {
    if (!returned || handled.current) return
    handled.current = true
    setParams({}, { replace: true })
    if (returned === 'return') refresh.mutate()
    if (returned === 'refresh') connect.mutate()
  }, [returned, setParams, refresh, connect])

  return (
    <Card as="section" className="grid overflow-hidden lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="border-border-soft flex flex-col gap-3 border-b p-6 lg:border-r lg:border-b-0">
        <span className="bg-surface-3 text-fg-2 flex size-10 items-center justify-center rounded-full">
          <CircleDollarSign className="size-5" aria-hidden />
        </span>
        <PanelHeading title={t('payments.section')} description={t('payments.sectionHelp')} />
      </div>

      <div className="flex flex-col gap-4 p-6">
        <PanelHeading title={t('payments.title')} description={t('payments.description')} />
        {isLoading ? (
          <LoadingState />
        ) : isError || !account ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <ProcessorRow
            account={account}
            onConnect={() => connect.mutate()}
            connecting={connect.isPending}
            onRefresh={() => refresh.mutate()}
            refreshing={refresh.isPending}
          />
        )}
      </div>
    </Card>
  )
}

interface ProcessorRowProps {
  account: PaymentAccount
  onConnect: () => void
  connecting: boolean
  onRefresh: () => void
  refreshing: boolean
}

function ProcessorRow({ account, onConnect, connecting, onRefresh, refreshing }: ProcessorRowProps) {
  const { t } = useTranslation('settings')
  const format = useFormatters()
  const canManage = hasAnyPermission(usePermissions(), ['settings.manage'])
  const disconnect = useDisconnectPaymentAccount()
  const reconnect = useReconnectPaymentAccount()
  const newAccount = useStartNewAccount()
  const [confirming, setConfirming] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const state = accountState(account)
  const tone = STATE_TONE[state]

  const primary = (() => {
    switch (state) {
      case 'unavailable':
      case 'notConnected':
        // Shown even when the server cannot connect yet, so the way in is visible; the notice says why.
        return (
          <Button onClick={onConnect} loading={connecting} disabled={state === 'unavailable'}>
            {t('payments.actions.connect')}
          </Button>
        )
      case 'disconnected':
        return (
          <>
            <Button variant="outline" onClick={() => setReplacing(true)}>
              {t('payments.actions.useDifferent')}
            </Button>
            <Button onClick={() => reconnect.mutate()} loading={reconnect.isPending}>
              {t('payments.actions.reconnect')}
            </Button>
          </>
        )
      case 'needsInfo':
        return (
          <Button onClick={onConnect} loading={connecting}>
            {t('payments.actions.continue')}
          </Button>
        )
      case 'inReview':
        return (
          <Button variant="outline" onClick={onRefresh} loading={refreshing}>
            {t('payments.actions.checkStatus')}
          </Button>
        )
      default:
        return (
          <Button variant="outline" asChild>
            <a href={STRIPE_DASHBOARD_URL} target="_blank" rel="noreferrer">
              {t('payments.actions.dashboard')}
              <ExternalLink />
            </a>
          </Button>
        )
    }
  })()

  const notice = noticeFor(state, account)
  const NoticeIcon = NOTICE_ICON[tone]

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'overflow-hidden rounded-[11px] border',
          state === 'active' ? 'border-primary' : 'border-border',
        )}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
          <StripeMark />

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold">{t('payments.stripe')}</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold',
                  TONE_CLASS[tone],
                )}
              >
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                {t(`payments.state.${state}`)}
              </span>
            </div>
            {account.connected ? (
              <>
                <p className="text-fg-3 text-[12.5px]">
                  {[
                    account.connectedAt &&
                      t('payments.connectedOn', { date: format.shortDate(account.connectedAt) }),
                    account.currency && t('payments.currency', { currency: account.currency }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {/* The badge already says Active; the capabilities matter while one is not. */}
                {state !== 'active' && (
                  <div className="flex flex-wrap gap-1.5">
                    <Capability
                      label={t('payments.capabilities.cardPayments')}
                      status={account.cardPayments}
                    />
                    <Capability label={t('payments.capabilities.payouts')} status={account.payouts} />
                  </div>
                )}
                <CheckoutMethods canManage={canManage} />
              </>
            ) : (
              // Disconnected has its own notice below; this line would contradict it.
              state !== 'disconnected' && <p className="text-fg-3 text-[12.5px]">{t('payments.summary')}</p>
            )}
          </div>

          {canManage && (
            <div className="ml-auto flex items-center gap-2">
              {account.connected && (
                <Button
                  variant="ghost"
                  className="text-error hover:bg-error-tint hover:text-error"
                  onClick={() => setConfirming(true)}
                >
                  {t('payments.actions.disconnect')}
                </Button>
              )}
              {primary}
            </div>
          )}
        </div>

        {notice && (
          <div
            className={cn('flex items-start gap-2.5 px-4 py-3 text-[12.5px]', TONE_CLASS[tone])}
            role="status"
          >
            <NoticeIcon className="mt-px size-4 shrink-0" aria-hidden />
            <p className="text-fg-2">{notice}</p>
          </div>
        )}
      </div>

      {!canManage && (state === 'notConnected' || state === 'needsInfo' || state === 'disconnected') && (
        <p className="text-fg-4 text-[12.5px]">{t('payments.ownerOnly')}</p>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('payments.confirmDisconnect.title')}
        description={t('payments.confirmDisconnect.description')}
        confirmLabel={t('payments.actions.disconnect')}
        confirmVariant="destructive"
        loading={disconnect.isPending}
        onConfirm={() => disconnect.mutate(undefined, { onSuccess: () => setConfirming(false) })}
      />
      <ConfirmDialog
        open={replacing}
        onOpenChange={setReplacing}
        title={t('payments.confirmNewAccount.title')}
        description={t('payments.confirmNewAccount.description')}
        confirmLabel={t('payments.confirmNewAccount.confirm')}
        confirmVariant="primary"
        // The page leaves for Stripe on success, so the dialog only closes itself on failure.
        loading={newAccount.isPending}
        onConfirm={() => newAccount.mutate(undefined, { onError: () => setReplacing(false) })}
      />
    </div>
  )

  function noticeFor(s: PaymentAccountState, a: PaymentAccount): string | null {
    if (s === 'needsInfo' && a.requirements === 'past_due') return t('payments.notice.pastDue')
    if (
      s === 'unavailable' ||
      s === 'disconnected' ||
      s === 'needsInfo' ||
      s === 'inReview' ||
      s === 'rejected'
    ) {
      return t(`payments.notice.${s}`)
    }
    return null
  }
}

/** Stripe's wordmark colour behind its name, so the processor reads at a glance. */
function StripeMark() {
  return (
    <span
      aria-hidden
      className="flex h-11 w-[72px] shrink-0 items-center justify-center rounded-[9px] bg-[#635BFF] text-[17px] font-bold tracking-tight text-white"
    >
      stripe
    </span>
  )
}

function Capability({ label, status }: { label: string; status?: string }) {
  const { t } = useTranslation('settings')
  const known = status ?? 'pending'
  // Stripe's enum is open: a value added later shows as Stripe wrote it rather than blank.
  const value = t(`payments.capabilityStatus.${known}` as never, { defaultValue: known })
  return (
    <span className="border-border-soft bg-surface-2 text-fg-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]">
      <span className={cn('size-1.5 rounded-full', CAPABILITY_DOT[known] ?? 'bg-fg-4')} aria-hidden />
      {label}
      <span className="text-fg-4">{value}</span>
    </span>
  )
}

/** What renters can pay with, as the company's Stripe settings stand. A wallet that is off can
 *  be switched on here; switching off stays in the Stripe Dashboard, where the owner controls it. */
function CheckoutMethods({ canManage }: { canManage: boolean }) {
  const { t } = useTranslation('settings')
  const { data: methods } = usePaymentMethods()
  const enable = useEnablePaymentMethod()

  if (!methods || methods.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-fg-4 mr-0.5 text-[12px]">{t('payments.accepts')}</span>
      {methods.map(({ type, available }) => (
        <span
          key={type}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-medium',
            // Accepted reads as a plain tag; one that is off is an outline with its fix beside it.
            available ? 'bg-surface-3 text-fg-2 border-transparent' : 'border-border text-fg-4 border-dashed',
          )}
        >
          {t(`payments.methods.${type}`)}
          {!available && <span className="sr-only">{t('payments.methodOff')}</span>}
          {!available && canManage && type !== 'card' && (
            <button
              type="button"
              className="text-primary ml-0.5 font-semibold hover:underline disabled:opacity-50"
              disabled={enable.isPending}
              onClick={() => enable.mutate(type)}
            >
              {t('payments.actions.turnOn')}
            </button>
          )}
        </span>
      ))}
    </div>
  )
}
