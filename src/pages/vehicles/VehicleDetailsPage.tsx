import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Archive, ArrowLeft, ChevronLeft, ChevronRight, Download, SquarePen } from 'lucide-react'
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
import { usePageHeaderActions } from '@/components/navigation/usePageHeaderActions'
import { initials } from '@/utils/formatting'
import { BOOKINGS_RECENT, BOOKINGS_UPCOMING } from '@/modules/bookings/mock/booking.mock'
import type { BookingTuple } from '@/modules/bookings/types/booking.types'
import { downloadBookingsCsv, parseBookingTotal } from '@/modules/bookings/utils/booking.utils'
import { AvailabilityStrip } from '@/modules/vehicles/components/AvailabilityStrip'
import { VehiclePerformance } from '@/modules/vehicles/components/VehiclePerformance'
import { VehiclePhotoGallery } from '@/modules/vehicles/components/VehiclePhotoGallery'
import { VehicleSpecs } from '@/modules/vehicles/components/VehicleSpecs'
import { VehicleStatusCard } from '@/modules/vehicles/components/VehicleStatusCard'
import { availabilityForVehicle } from '@/modules/vehicles/utils/availability'
import type { VehicleStatus } from '@/modules/vehicles/types/vehicle.types'
import { useDeleteVehicle, useUpdateVehicle, useVehicle, useVehicles } from '@/modules/vehicles/hooks/use-vehicles'
import {
  formatCurrency,
  formatRateOptionBasis,
  formatRateOptionMileage,
  formatRateOptionPrice,
  vehicleDisplayName,
  vehicleSubtitle,
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

function bookingHistoryColumns() {
  return [
    { label: 'Customer', align: 'left' as const },
    { label: 'Rental window', align: 'left' as const },
    { label: 'Location', align: 'left' as const },
    { label: 'Status', align: 'left' as const },
    { label: 'Total', align: 'right' as const },
  ]
}

/** Same shape as bookingRow(), minus the Vehicle column — redundant on a page already scoped to one vehicle. */
function bookingHistoryRow(b: BookingTuple): Row {
  const [customer, reference, , , window, note, location, status, total] = b

  return {
    key: reference,
    cells: [
      {
        kind: 'avatar',
        primary: customer,
        secondary: reference,
        initials: initials(customer),
        avatarBg: 'var(--color-surface-3)',
        avatarFg: 'var(--color-fg-2)',
        avatarRadius: '99px',
        subFontMono: true,
      },
      { kind: 'stack', primary: window, secondary: note, weight: 500, subFontMono: false },
      { kind: 'text', primary: location },
      { kind: 'badge', status },
      { kind: 'amount', primary: total, align: 'right', tone: total.charAt(0) === '−' ? 'var(--color-fg-3)' : 'var(--color-foreground)' },
    ],
  }
}

export function VehicleDetailsPage() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const [confirmArchive, setConfirmArchive] = useState(false)

  const { data: vehicle, isLoading, isError, refetch } = useVehicle(vehicleId)
  const { data: fleet } = useVehicles({ page: 1, pageSize: 100 })
  const updateVehicle = useUpdateVehicle(vehicleId ?? '')
  const deleteVehicle = useDeleteVehicle()

  usePageBreadcrumb(vehicle ? vehicleDisplayName(vehicle) : undefined)
  usePageHeaderActions(
    vehicle ? [{ label: 'Edit vehicle', icon: SquarePen, onClick: () => navigate(`/app/vehicles/${vehicle.id}/edit`) }] : [],
    [vehicle?.id],
  )

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading vehicle…" />
      </PageContainer>
    )
  }

  if (isError || !vehicle) {
    return (
      <PageContainer>
        <PageHeader title="Vehicle not found" description="This vehicle may have been removed." />
        <ErrorState
          title="Vehicle not found"
          description="We couldn't find that vehicle. It may have been deleted."
          onRetry={() => refetch()}
        />
      </PageContainer>
    )
  }

  // No bookings API yet — mock data, matched to this vehicle by plate. See vehicle.api.ts for the same temporary pattern.
  const bookings = [...BOOKINGS_UPCOMING, ...BOOKINGS_RECENT].filter((b) => b[3] === vehicle.plate)
  const revenue = bookings
    .filter((b) => !NON_EARNING_STATUSES.includes(b[7]))
    .reduce((sum, b) => sum + parseBookingTotal(b[8]), 0)
  const activeBooking = vehicle.status === 'On rent' ? BOOKINGS_UPCOMING.find((b) => b[3] === vehicle.plate) : undefined
  const currentRental = activeBooking ? { customer: activeBooking[0], reference: activeBooking[1], window: activeBooking[4] } : undefined

  const daysOnRent = availabilityForVehicle(vehicle).filter((d) => d.state === 'booked').length
  const fleetItems = fleet?.items ?? []
  const fleetUtilization = fleetItems.length
    ? fleetItems.reduce((sum, v) => sum + v.utilization, 0) / fleetItems.length
    : vehicle.utilization

  const fleetIds = fleetItems.map((v) => v.id)
  const fleetIndex = fleetIds.indexOf(vehicle.id)
  const positionLabel = fleetIndex >= 0 ? `${fleetIndex + 1} of ${fleet?.total ?? fleetIds.length}` : null
  const prevVehicleId = fleetIndex > 0 ? fleetIds[fleetIndex - 1] : undefined
  const nextVehicleId = fleetIndex >= 0 && fleetIndex < fleetIds.length - 1 ? fleetIds[fleetIndex + 1] : undefined

  const handleStatusChange = (status: VehicleStatus) => {
    updateVehicle.mutate({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      class: vehicle.class,
      color: vehicle.color,
      plate: vehicle.plate,
      vin: vehicle.vin,
      location: vehicle.location,
      mileage: vehicle.mileage,
      description: vehicle.description,
      notes: vehicle.notes,
      photos: vehicle.photos,
      rateOptions: vehicle.rateOptions,
      fees: vehicle.fees,
      specs: vehicle.specs,
      status,
    })
  }

  return (
    <PageContainer>
      <PageHeader
        leading={
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Back to vehicles">
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
                  aria-label="Previous vehicle"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-[30px]"
                  disabled={!nextVehicleId}
                  onClick={() => nextVehicleId && navigate(`/app/vehicles/${nextVehicleId}`)}
                  aria-label="Next vehicle"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </>
            )}
            <PageActionButton icon={Archive} label="Archive" onClick={() => setConfirmArchive(true)} />
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-4">
          <VehiclePhotoGallery key={vehicle.id} photos={vehicle.photos} />
          <AvailabilityStrip vehicle={vehicle} />
          <VehicleSpecs vehicle={vehicle} />

          {vehicle.description && (
            <Card className="flex flex-col gap-2 p-[18px]">
              <PanelHeading title="Description" description="Customer-facing summary shown on the listing" />
              <p className="text-[13px]" style={{ textWrap: 'pretty' }}>
                {vehicle.description}
              </p>
            </Card>
          )}

          {bookings.length > 0 ? (
            <RecordTable
              title="Booking history"
              columns={bookingHistoryColumns()}
              rows={bookings.map(bookingHistoryRow)}
              pageNote={`Showing ${bookings.length} of ${bookings.length} rentals`}
              minWidth="680px"
              actions={
                <PageActionButton
                  icon={Download}
                  label="Export History"
                  className="!text-[11.5px]"
                  onClick={() => downloadBookingsCsv(bookings, `${vehicle.plate}-booking-history.csv`)}
                />
              }
            />
          ) : (
            <Card className="flex flex-col gap-1 p-[18px]">
              <PanelHeading title="Booking history" />
              <p className="text-fg-3 text-[13px]">No bookings for this vehicle yet.</p>
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <VehicleStatusCard vehicle={vehicle} currentRental={currentRental} onStatusChange={handleStatusChange} />

          <VehiclePerformance vehicle={vehicle} fleetUtilization={fleetUtilization} revenue={revenue} daysOnRent={daysOnRent} />

          <Card className="flex flex-col gap-3 p-[18px]">
            <PanelHeading title="Rate options" description={`${vehicle.rateOptions.length} available`} />
            <div className="border-border-soft divide-y divide-[var(--color-border-soft)] border-t">
              {vehicle.rateOptions.map((option) => (
                <div key={option.id} className="flex flex-col gap-0.5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold">{option.label}</span>
                    <span className="text-[13px] font-semibold">{formatRateOptionPrice(option)}</span>
                  </div>
                  <div className="text-fg-4 flex items-center gap-2 text-[11.5px]">
                    <span>{formatRateOptionBasis(option)}</span>
                    <span>·</span>
                    <span>{formatRateOptionMileage(option)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-1 p-[18px]">
            <PanelHeading title="Deposit, fees &amp; tax" className="mb-1.5" />
            {vehicle.fees.deposit != null && <FeeRow label="Deposit" value={formatCurrency(vehicle.fees.deposit)} />}
            {vehicle.fees.overageRatePerMile != null && (
              <FeeRow label="Overage rate" value={`${formatCurrency(vehicle.fees.overageRatePerMile)}/mi`} />
            )}
            {vehicle.fees.fuelChargeRate != null && (
              <FeeRow label="Fuel charge" value={`${formatCurrency(vehicle.fees.fuelChargeRate)} / 1/8 tank`} />
            )}
            {vehicle.fees.taxRatePct != null && <FeeRow label="Tax rate" value={`${vehicle.fees.taxRatePct}%`} />}
          </Card>

          <Card className="flex flex-col gap-2.5 p-[18px]">
            <PanelHeading title="Notes" />
            <p className="text-fg-3 text-[13px]" style={{ textWrap: 'pretty' }}>
              {vehicle.notes || 'No notes for this vehicle yet.'}
            </p>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archive vehicle?"
        description={`${vehicleDisplayName(vehicle)} (${vehicle.plate}) will be archived and removed from the active fleet. This can't be undone.`}
        confirmLabel="Archive vehicle"
        loading={deleteVehicle.isPending}
        onConfirm={() => {
          deleteVehicle.mutate(vehicle, { onSuccess: () => navigate('/app/vehicles') })
        }}
      />
    </PageContainer>
  )
}
