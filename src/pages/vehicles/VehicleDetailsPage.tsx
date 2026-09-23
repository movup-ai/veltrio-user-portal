import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Archive, ArrowLeft, ChevronLeft, ChevronRight, Download, SquarePen } from 'lucide-react'
import { useFormatters } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { RecordTable } from '@/components/data-display/RecordTable'
import type { Row } from '@/components/data-display/record-table.types'
import { usePageBreadcrumb } from '@/components/navigation/usePageBreadcrumb'
import { CopyLinkButton } from '@/modules/vehicles/components/CopyLinkButton'
import { vehicleUrl } from '@/modules/vehicles/utils/public-links'
import { useOrganizationStore } from '@/state/organization.store'
import type { BookingTuple } from '@/modules/bookings/types/booking.types'
import { useBookings } from '@/modules/bookings/hooks/use-bookings'
import { intervalsForPlate } from '@/modules/bookings/utils/booking.schedule'
import { downloadBookingsCsv, parseBookingTotal } from '@/modules/bookings/utils/booking.utils'
import { AvailabilityStrip } from '@/modules/vehicles/components/AvailabilityStrip'
import { VehiclePerformance } from '@/modules/vehicles/components/VehiclePerformance'
import { VehiclePhotoGallery } from '@/modules/vehicles/components/VehiclePhotoGallery'
import { VehicleServiceHistory } from '@/modules/vehicles/components/VehicleServiceHistory'
import { VehicleSpecs } from '@/modules/vehicles/components/VehicleSpecs'
import { VehicleStatusCard } from '@/modules/vehicles/components/VehicleStatusCard'
import { availabilityForVehicle } from '@/modules/vehicles/utils/availability'
import type { VehicleStatus } from '@/modules/vehicles/types/vehicle.types'
import {
  useArchiveVehicle,
  useReturnFromService,
  useSendToService,
  useUpdateVehicle,
  useVehicle,
  useVehicles,
} from '@/modules/vehicles/hooks/use-vehicles'
import {
  formatRateOptionBasis,
  formatRateOptionMileage,
  formatRateOptionPrice,
  vehicleDisplayName,
  vehicleSubtitle,
  vehicleToInput,
} from '@/modules/vehicles/utils/vehicle.utils'

/** Statuses that mean the money never landed — excluded from booked-value totals. */
const NON_EARNING_STATUSES = ['Refunded', 'Payment failed']

function FeeRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-fg-3 text-[13px]">{label}</span>
      <span className="text-[13px] font-semibold">{value}</span>
    </div>
  )
}

function bookingHistoryColumns(t: TFunction<'vehicles'>) {
  return [
    { label: t('details.bookingColumns.bookingId'), align: 'left' as const },
    { label: t('details.bookingColumns.customer'), align: 'left' as const },
    { label: t('details.bookingColumns.rentalWindow'), align: 'left' as const },
    { label: t('details.bookingColumns.location'), align: 'left' as const },
    { label: t('details.bookingColumns.status'), align: 'left' as const },
    { label: t('details.bookingColumns.total'), align: 'right' as const },
  ]
}

/** Same shape as bookingRow(), minus the Vehicle column — redundant on a page already scoped to one vehicle. */
function bookingHistoryRow(b: BookingTuple): Row {
  const [customer, reference, , , window, note, location, status, total] = b

  return {
    key: reference,
    cells: [
      { kind: 'text', primary: reference, fontMono: true },
      { kind: 'text', primary: customer },
      { kind: 'stack', primary: window, secondary: note, weight: 500, subFontMono: false },
      { kind: 'text', primary: location },
      { kind: 'badge', status },
      { kind: 'amount', primary: total, align: 'right', tone: total.charAt(0) === '−' ? 'var(--color-fg-3)' : 'var(--color-foreground)' },
    ],
  }
}

export function VehicleDetailsPage() {
  const { t } = useTranslation('vehicles')
  const { t: tBookings } = useTranslation('bookings')
  const format = useFormatters()
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const subdomain = useOrganizationStore((s) => s.membership?.subdomain)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmService, setConfirmService] = useState(false)

  const { data: vehicle, isLoading, isError, refetch } = useVehicle(vehicleId)
  const { data: fleet } = useVehicles({ page: 1, pageSize: 100 })
  const { data: bookingLists } = useBookings()
  const schedule = bookingLists?.schedule ?? []
  const updateVehicle = useUpdateVehicle(vehicleId ?? '')
  const archiveVehicle = useArchiveVehicle()
  const sendToService = useSendToService()
  const returnFromService = useReturnFromService()

  usePageBreadcrumb(vehicle ? vehicleDisplayName(vehicle) : undefined)
  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label={t('details.loading')} />
      </PageContainer>
    )
  }

  if (isError || !vehicle) {
    return (
      <PageContainer>
        <PageHeader title={t('details.notFoundTitle')} description={t('details.notFoundDescription')} />
        <ErrorState title={t('details.notFoundTitle')} description={t('details.notFoundError')} onRetry={() => refetch()} />
      </PageContainer>
    )
  }

  // Bookings come from the same query as the availability strip rather than straight from the
  // mock arrays, so a booking made this session shows up in both.
  const upcoming = bookingLists?.upcoming ?? []
  const bookings = [...upcoming, ...(bookingLists?.recent ?? [])].filter((b) => b[3] === vehicle.plate)
  const revenue = bookings
    .filter((b) => !NON_EARNING_STATUSES.includes(b[7]))
    .reduce((sum, b) => sum + parseBookingTotal(b[8]), 0)
  const activeBooking = vehicle.status === 'On rent' ? upcoming.find((b) => b[3] === vehicle.plate) : undefined
  const currentRental = activeBooking ? { customer: activeBooking[0], reference: activeBooking[1], window: activeBooking[4] } : undefined

  const busy = intervalsForPlate(schedule, vehicle.plate)
  const daysOnRent = availabilityForVehicle(vehicle, busy).filter((d) => d.state === 'booked').length
  const fleetItems = fleet?.items ?? []
  const fleetUtilization = fleetItems.length
    ? fleetItems.reduce((sum, v) => sum + v.utilization, 0) / fleetItems.length
    : vehicle.utilization

  const fleetIds = fleetItems.map((v) => v.id)
  const fleetIndex = fleetIds.indexOf(vehicle.id)
  const positionLabel =
    fleetIndex >= 0 ? t('details.position', { index: fleetIndex + 1, total: fleet?.total ?? fleetIds.length }) : null
  const prevVehicleId = fleetIndex > 0 ? fleetIds[fleetIndex - 1] : undefined
  const nextVehicleId = fleetIndex >= 0 && fleetIndex < fleetIds.length - 1 ? fleetIds[fleetIndex + 1] : undefined

  const handleStatusChange = (status: VehicleStatus) => {
    updateVehicle.mutate({ ...vehicleToInput(vehicle), status })
  }

  return (
    <PageContainer>
      <PageHeader
        leading={
          <Button
            variant="outline"
            size="icon"
            // Always the fleet list: history could be a booking, a search result or another tab.
            onClick={() => navigate('/app/vehicles')}
            aria-label={t('details.backToVehicles')}
          >
            <ArrowLeft className="size-4" />
          </Button>
        }
        title={vehicleDisplayName(vehicle)}
        description={`${vehicleSubtitle(vehicle)} · ${vehicle.plate} · ${vehicle.location}`}
        actions={
          <>
            {positionLabel && (
              <>
                <span className="text-fg-4 text-[12.5px] tabular-nums">{positionLabel}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-[30px]"
                  disabled={!prevVehicleId}
                  onClick={() => prevVehicleId && navigate(`/app/vehicles/${prevVehicleId}`)}
                  aria-label={t('details.previousVehicle')}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-[30px]"
                  disabled={!nextVehicleId}
                  onClick={() => nextVehicleId && navigate(`/app/vehicles/${nextVehicleId}`)}
                  aria-label={t('details.nextVehicle')}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </>
            )}
            {subdomain && (
              <CopyLinkButton
                url={vehicleUrl(subdomain, vehicle)}
                label={t('publicLink.vehicleLink')}
              />
            )}
            <PageActionButton icon={Archive} label={t('details.archive')} onClick={() => setConfirmArchive(true)} />
            <PageActionButton
              icon={SquarePen}
              label={t('details.editVehicle')}
              variant="solid"
              onClick={() => navigate(`/app/vehicles/${vehicle.id}/edit`)}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-4">
          <VehiclePhotoGallery key={vehicle.id} vehicleId={vehicle.id} photos={vehicle.photos} />
          <AvailabilityStrip vehicle={vehicle} busy={busy} />
          <VehicleSpecs vehicle={vehicle} />

          {vehicle.description && (
            <Card className="flex flex-col gap-2 p-[18px]">
              <PanelHeading title={t('details.descriptionTitle')} description={t('details.descriptionSubtitle')} />
              <p className="text-[13px]" style={{ textWrap: 'pretty' }}>
                {vehicle.description}
              </p>
            </Card>
          )}

          {bookings.length > 0 ? (
            <RecordTable
              title={t('details.bookingHistory')}
              columns={bookingHistoryColumns(t)}
              rows={bookings.map(bookingHistoryRow)}
              pageNote={t('details.bookingHistoryNote', { count: bookings.length, total: bookings.length })}
              minWidth="680px"
              actions={
                <PageActionButton
                  icon={Download}
                  label={t('details.exportHistory')}
                  className="!text-[11.5px]"
                  onClick={() => downloadBookingsCsv(bookings, `${vehicle.plate}-booking-history.csv`, tBookings)}
                />
              }
            />
          ) : (
            <Card className="flex flex-col gap-1 p-[18px]">
              <PanelHeading title={t('details.bookingHistory')} />
              <p className="text-fg-3 text-[13px]">{t('details.noBookings')}</p>
            </Card>
          )}

        </div>

        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <VehicleStatusCard
            vehicle={vehicle}
            currentRental={currentRental}
            onStatusChange={handleStatusChange}
            onSendToService={() => setConfirmService(true)}
            onReturnFromService={() => returnFromService.mutate(vehicle)}
            serviceActionPending={sendToService.isPending || returnFromService.isPending}
          />

          <VehiclePerformance vehicle={vehicle} fleetUtilization={fleetUtilization} revenue={revenue} daysOnRent={daysOnRent} />

          <Card className="flex flex-col gap-3 p-[18px]">
            <PanelHeading
              title={t('details.rateOptions')}
              description={t('details.rateOptionsCount', { count: vehicle.rateOptions.length })}
            />
            <div className="border-border-soft divide-y divide-[var(--color-border-soft)] border-t">
              {vehicle.rateOptions.map((option) => (
                <div key={option.id} className="flex flex-col gap-0.5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold">{option.label}</span>
                    <span className="text-[13px] font-semibold">{formatRateOptionPrice(option)}</span>
                  </div>
                  <div className="text-fg-4 flex items-center gap-2 text-[11.5px]">
                    <span>{formatRateOptionBasis(option, t)}</span>
                    <span>·</span>
                    <span>{formatRateOptionMileage(option, t)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-1 p-[18px]">
            <PanelHeading title={t('details.feesTitle')} className="mb-1.5" />
            {vehicle.fees.deposit != null && (
              <FeeRow label={t('fees.deposit')} value={format.currency(vehicle.fees.deposit)} />
            )}
            {vehicle.fees.overageRatePerMile != null && (
              <FeeRow label={t('fees.overageRate')} value={`${format.currency(vehicle.fees.overageRatePerMile)}/mi`} />
            )}
            {vehicle.fees.fuelChargeRate != null && (
              <FeeRow
                label={t('fees.fuelCharge')}
                value={`${format.currency(vehicle.fees.fuelChargeRate)} ${t('form.fields.fuelChargeUnit')}`}
              />
            )}
            {vehicle.fees.taxRatePct != null && <FeeRow label={t('fees.taxRate')} value={`${vehicle.fees.taxRatePct}%`} />}
          </Card>

          <Card className="flex flex-col gap-2.5 p-[18px]">
            <PanelHeading title={t('details.notes')} />
            <p className="text-fg-3 text-[13px]" style={{ textWrap: 'pretty' }}>
              {vehicle.notes || t('details.noNotes')}
            </p>
          </Card>

          <VehicleServiceHistory vehicleId={vehicle.id} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={t('archiveDialog.title')}
        description={t('archiveDialog.description', { name: vehicleDisplayName(vehicle), plate: vehicle.plate })}
        confirmLabel={t('archiveDialog.confirm')}
        loading={archiveVehicle.isPending}
        onConfirm={() => {
          archiveVehicle.mutate(vehicle, { onSuccess: () => navigate("/app/vehicles") })
        }}
      />

      <ConfirmDialog
        open={confirmService}
        onOpenChange={setConfirmService}
        title={t('service.confirmSendToService.title')}
        description={t('service.confirmSendToService.description')}
        confirmLabel={t('service.confirmSendToService.confirm')}
        confirmVariant="primary"
        loading={sendToService.isPending}
        onConfirm={() => {
          sendToService.mutate(vehicle, { onSuccess: () => setConfirmService(false) })
        }}
      />
    </PageContainer>
  )
}
