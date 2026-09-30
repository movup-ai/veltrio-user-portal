import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CarFront,
  ExternalLink,
  KeyRound,
  Mail,
  Printer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { usePageBreadcrumb } from '@/components/navigation/usePageBreadcrumb'
import { useFormatters } from '@/i18n'
import { BookingActivity } from '@/modules/bookings/components/BookingActivity'
import { BookingAgreementCard } from '@/modules/bookings/components/BookingAgreementCard'
import { BookingChecklist } from '@/modules/bookings/components/BookingChecklist'
import { BookingManagePanel } from '@/modules/bookings/components/BookingManagePanel'
import { BookingPaymentCard } from '@/modules/bookings/components/BookingPaymentCard'
import { BookingRenterCard } from '@/modules/bookings/components/BookingRenterCard'
import { BookingTripCard } from '@/modules/bookings/components/BookingTripCard'
import { RentalProgress } from '@/modules/bookings/components/RentalProgress'
import { useBookingDetails } from '@/modules/bookings/hooks/use-bookings'
import {
  useOrderScreening,
  useScreening,
  useScreeningReport,
} from '@/modules/bookings/hooks/use-screening'

/**
 * Cover shot for the booked car, with the placeholder sitting underneath rather than swapped in
 * on failure. A remote photo that errors — or simply never resolves — would otherwise leave a
 * white hole in the middle of the card.
 */
function VehicleCover({ src }: { src?: string }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <span className="border-border bg-surface-2 relative flex h-[86px] w-[132px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border">
      <CarFront className="text-fg-4 size-6" aria-hidden />
      {src && !failed && (
        <img
          src={src}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </span>
  )
}

export function BookingDetailsPage() {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const { t: tVehicles } = useTranslation('vehicles')
  const format = useFormatters()
  const navigate = useNavigate()
  const { bookingId } = useParams()
  const [confirmCancel, setConfirmCancel] = useState(false)

  const { data: booking, isLoading, isError, refetch } = useBookingDetails(bookingId)
  // Its own query, so a check that takes days can be polled without refetching the whole page.
  const { data: screening } = useScreening(bookingId)
  const orderScreening = useOrderScreening(bookingId ?? '')
  const screeningReport = useScreeningReport(bookingId ?? '')

  usePageBreadcrumb(bookingId)
  // Checking in a rental that has already been returned and closed is meaningless.
  const stillOpen = booking != null && booking.stages.at(-1)?.state !== 'done'
  /**
   * Every write on this page needs an endpoint that doesn't exist yet, so the ones that can't be
   * faked honestly say so rather than pretending to have worked. See booking.api.ts.
   */
  function pending(action: string) {
    toast({ title: action, description: t('details.actions.pendingApi') })
  }

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('details.loading')} />
      </PageContainer>
    )
  }

  if (isError || !booking) {
    return (
      <PageContainer>
        <PageHeader title={t('details.notFoundTitle')} description={t('details.notFoundDescription')} />
        <ErrorState
          title={t('details.notFoundTitle')}
          description={t('details.notFoundDescription')}
          onRetry={() => refetch()}
        />
      </PageContainer>
    )
  }

  const dateTime = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  } as const
  const closed = !stillOpen

  return (
    <PageContainer>
      <PageHeader
        leading={
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/app/bookings')}
            aria-label={t('details.backToList')}
          >
            <ArrowLeft className="size-4" />
          </Button>
        }
        title={booking.reference}
        badge={<StatusBadge status={booking.status} />}
        description={`${booking.renter.name} · ${booking.vehicleName} · ${booking.pickupLocation}`}
        actions={
          <>
            <PageActionButton
              icon={Printer}
              label={t('details.actions.printAgreement')}
              onClick={() => window.print()}
            />
            <PageActionButton
              icon={Mail}
              label={t('details.actions.messageRenter')}
              onClick={() => {
                if (!booking.renter.email) return pending(t('details.actions.messageRenter'))
                window.location.href = `mailto:${booking.renter.email}?subject=${encodeURIComponent(booking.reference)}`
              }}
            />
            {stillOpen && (
              <PageActionButton
                icon={KeyRound}
                label={t('details.actions.checkIn')}
                variant="solid"
                onClick={() => pending(t('details.actions.checkIn'))}
              />
            )}
          </>
        }
      />

      <RentalProgress stages={booking.stages} />

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <BookingTripCard
              icon={ArrowUpRight}
              label={t('details.pickup.title')}
              when={format.date(booking.pickupAt, dateTime)}
              place={[booking.pickupLocation, booking.pickupAddress].filter(Boolean).join(' · ')}
              rows={[
                {
                  label: t('details.pickup.counter'),
                  value: t('details.pickup.desk', { number: booking.counter, agent: booking.agent }),
                },
                { label: t('details.pickup.fuelOut'), value: t('details.pickup.fuelPolicy') },
              ]}
            />
            <BookingTripCard
              icon={ArrowDownLeft}
              label={t('details.return.title')}
              when={format.shortDate(booking.returnAt)}
              place={
                booking.returnSameBranch
                  ? `${booking.returnLocation} · ${t('details.return.sameBranch')}`
                  : `${booking.returnLocation} · ${t('details.return.oneWay')}`
              }
              rows={[
                {
                  label: t('details.return.duration'),
                  value: t('details.return.days', { count: booking.days }),
                },
                {
                  label: t('details.return.mileageCap'),
                  value:
                    booking.includedMiles == null
                      ? tVehicles('rateOptions.unlimitedMiles')
                      : t('details.return.milesIncluded', { count: booking.includedMiles }),
                },
              ]}
            />
          </div>

          <Card as="section" className="flex flex-col p-[18px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-panel-title m-0">{t('details.vehicle.title')}</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!booking.vehicleId}
                onClick={() => booking.vehicleId && navigate(`/app/vehicles/${booking.vehicleId}`)}
              >
                {t('details.vehicle.open')}
                <ExternalLink className="size-3.5" aria-hidden />
              </Button>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-4">
              <VehicleCover src={booking.vehicleImage} />

              <div className="min-w-0 flex-1">
                <p className="m-0 text-[15px] font-semibold">{booking.vehicleName}</p>
                <p className="text-fg-4 m-0 mt-0.5 text-[12.5px]">{booking.vehicleSubtitle}</p>
                <p className="text-fg-3 m-0 mt-0.5 font-mono text-[12px]">{booking.vehiclePlate}</p>
              </div>

              <div className="shrink-0 text-right">
                <p className="m-0 text-[17px] font-bold tabular-nums">
                  {t('details.vehicle.perDay', { rate: format.currency(booking.listDailyRate) })}
                </p>
                <p className="text-fg-4 m-0 text-[11.5px]">{t('details.vehicle.listRate')}</p>
              </div>
            </div>
          </Card>

          <BookingRenterCard
            renter={booking.renter}
            onOpenProfile={() => navigate('/app/customers')}
            checklist={
              <BookingChecklist
                checks={booking.checks}
                screening={screening}
                ordering={orderScreening.isPending}
                openingReport={screeningReport.isPending}
                onOrderScreening={() => orderScreening.mutate()}
                onViewScreeningReport={() => screeningReport.mutate()}
                onAction={(key) => pending(t(`details.checks.${key}`))}
              />
            }
          />

          {/* Nothing here applies once the car is back and the paperwork is closed — you can't
              extend or cancel a rental that has already finished. */}
          {!closed && (
            <BookingManagePanel
              onAction={(action) => {
                if (action === 'cancel') return setConfirmCancel(true)
                pending(t(`details.manage.${action}`))
              }}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <BookingPaymentCard
            payment={booking.payment}
            charges={booking.charges}
            days={booking.days}
            onAction={(action) => pending(t(`details.payment.${action}`))}
          />

          <BookingAgreementCard
            agreement={booking.agreement}
            reference={booking.reference}
            onAction={(action) => pending(t(`details.agreement.${action}`))}
          />

          {/* Last in the sidebar: a history to glance at, not something acted on. */}
          <BookingActivity events={booking.events} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title={t('details.cancelDialog.title')}
        description={t('details.cancelDialog.description', {
          reference: booking.reference,
          name: booking.renter.name,
        })}
        confirmLabel={t('details.cancelDialog.confirm')}
        cancelLabel={tCommon('actions.back')}
        onConfirm={() => {
          setConfirmCancel(false)
          pending(t('details.manage.cancel'))
        }}
      />
    </PageContainer>
  )
}
