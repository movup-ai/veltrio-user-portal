import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CarFront,
  ExternalLink,
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
import { BookingHandoverAction } from '@/modules/bookings/components/BookingHandoverAction'
import { BookingManagePanel } from '@/modules/bookings/components/BookingManagePanel'
import { BookingPaymentSection } from '@/modules/bookings/components/BookingPaymentSection'
import { BookingRenterCard } from '@/modules/bookings/components/BookingRenterCard'
import { BookingTripCard } from '@/modules/bookings/components/BookingTripCard'
import { RentalProgress } from '@/modules/bookings/components/RentalProgress'
import { useBookingDetails } from '@/modules/bookings/hooks/use-bookings'
import {
  useInsuranceLinkDialog,
  useInsuranceResults,
  useOrderVerification,
  useVerification,
  useVerificationReport,
} from '@/modules/bookings/hooks/use-verification'
import { insuranceReturnUri } from '@/modules/bookings/utils/booking.insurance-redirect'
import { InsuranceLinkDialog } from '@/modules/bookings/components/InsuranceLinkDialog'
import type { InsuranceOrderWire } from '@/modules/bookings/api/booking.mapper'
import {
  PROVIDER_KINDS,
  type BookingVerification,
  type ProviderKind,
} from '@/modules/bookings/types/booking.types'

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
  const { data: background } = useVerification(bookingId, 'background')
  const { data: insurance } = useVerification(bookingId, 'insurance')
  const orderVerification = useOrderVerification(bookingId ?? '')
  const verificationReport = useVerificationReport(bookingId ?? '')
  // Still heard when a sent link is finished in this browser, such as one the desk opened.
  useInsuranceResults()
  const insuranceLink = useInsuranceLinkDialog()

  const verifications: Partial<Record<ProviderKind, BookingVerification>> = { background, insurance }

  const orderingKind: ProviderKind | undefined = orderVerification.isPending
    ? 'background'
    : undefined

  /** The session to send the renter; asking again while it is open returns the same link. */
  function insuranceOrder(): InsuranceOrderWire | undefined {
    // Declared above the loading guard, so the booking is narrowed here rather than there.
    if (!booking) return undefined
    const { dateOfBirth } = booking.renter
    // Older customers can lack one, and the API matches on it; say so rather than toast a 422.
    if (!dateOfBirth) {
      toast({ title: t('verification.insurance.needsDob'), variant: 'error' })
      return undefined
    }
    return {
      name: booking.renter.name,
      email: booking.renter.email,
      dateOfBirth,
      reference: booking.reference,
      redirectUri: insuranceReturnUri(window.location),
    }
  }

  // Only the background check runs from here; insurance is sent to the renter (handleShare).
  function handleOrder(kind: ProviderKind) {
    if (kind === 'background') orderVerification.mutate()
  }

  function handleShare() {
    const order = insuranceOrder()
    if (order) insuranceLink.share(order)
  }

  usePageBreadcrumb(bookingId)
  // A rental that has been returned and closed takes no more changes.
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
            onClick={() => navigate('/bookings')}
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
            <BookingHandoverAction reference={booking.reference} />
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
                onClick={() => booking.vehicleId && navigate(`/vehicles/${booking.vehicleId}`)}
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
            onOpenProfile={() => navigate('/customers')}
            checklist={
              <BookingChecklist
                checks={booking.checks}
                verifications={verifications}
                providerKinds={PROVIDER_KINDS}
                ordering={orderingKind}
                openingReport={verificationReport.isPending}
                onOrder={handleOrder}
                onViewReport={() => verificationReport.open()}
                onShare={handleShare}
                sharing={insuranceLink.sharing ? 'insurance' : undefined}
                closed={closed}
                onAction={(kind) => pending(t(`details.checks.${kind}`))}
              />
            }
          />

          {/* Under the renter: the booking's history reads best at the width of the page. */}
          <BookingActivity events={booking.events} />
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <BookingPaymentSection
            reference={booking.reference}
            renter={booking.renter}
            charges={booking.charges}
            days={booking.days}
          />

          <BookingAgreementCard
            agreement={booking.agreement}
            reference={booking.reference}
            onAction={(action) => pending(t(`details.agreement.${action}`))}
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

      <InsuranceLinkDialog
        {...insuranceLink.dialog}
        renterName={booking.renter.name}
        defaultEmail={booking.renter.email}
        defaultPhone={booking.renter.phone}
      />
    </PageContainer>
  )
}
