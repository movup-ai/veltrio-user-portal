import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Gauge, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { VEHICLE_STATUSES, type VehicleStatus } from '@/modules/vehicles/types/vehicle.types'
import { useDeleteVehicle, useUpdateVehicle, useVehicle } from '@/modules/vehicles/hooks/use-vehicles'
import {
  formatCurrency,
  formatRateOptionBasis,
  formatRateOptionMileage,
  formatRateOptionPrice,
  vehicleDisplayName,
  vehicleSubtitle,
} from '@/modules/vehicles/utils/vehicle.utils'

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-fg-3 text-[13px]">{label}</span>
      <span className="text-[13px] font-semibold">{value}</span>
    </div>
  )
}

export function VehicleDetailsPage() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: vehicle, isLoading, isError, refetch } = useVehicle(vehicleId)
  const updateVehicle = useUpdateVehicle(vehicleId ?? '')
  const deleteVehicle = useDeleteVehicle()

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

  const pct = Math.round(vehicle.utilization * 100)

  return (
    <PageContainer>
      <PageHeader
        title={vehicleDisplayName(vehicle)}
        description={`${vehicle.plate} · ${vehicle.location}`}
        actions={
          <>
            <PageActionButton icon={Pencil} label="Edit vehicle" onClick={() => navigate(`/app/vehicles/${vehicle.id}/edit`)} />
            <PageActionButton icon={Trash2} label="Delete" onClick={() => setConfirmDelete(true)} />
          </>
        }
      />

      <div className="flex flex-wrap gap-4">
        <Card className="flex min-w-0 flex-[2_1_360px] flex-col gap-4 p-[18px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PanelHeading title="Overview" description={vehicleSubtitle(vehicle)} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="cursor-pointer">
                  <StatusBadge status={vehicle.status} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {VEHICLE_STATUSES.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onSelect={() => {
                      if (status === vehicle.status) return
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
                        status: status as VehicleStatus,
                      })
                    }}
                  >
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="border-border-soft divide-y divide-[var(--color-border-soft)] border-t">
            <SpecRow label="Make" value={vehicle.make} />
            <SpecRow label="Model" value={vehicle.model} />
            <SpecRow label="Year" value={vehicle.year} />
            <SpecRow label="Vehicle type" value={vehicle.class} />
            <SpecRow label="Color" value={vehicle.color} />
            <SpecRow label="Plate" value={<span className="font-mono">{vehicle.plate}</span>} />
            <SpecRow label="VIN" value={<span className="font-mono">{vehicle.vin}</span>} />
            <SpecRow label="Mileage" value={`${vehicle.mileage.toLocaleString('en-US')} mi`} />
            <SpecRow label="Transmission" value={vehicle.specs.transmission} />
            <SpecRow label="Fuel type" value={vehicle.specs.fuelType} />
            <SpecRow label="Seats / Doors" value={`${vehicle.specs.seats} seats · ${vehicle.specs.doors} doors`} />
            {vehicle.specs.topSpeedMph != null && <SpecRow label="Top speed" value={`${vehicle.specs.topSpeedMph} mph`} />}
            {vehicle.specs.horsepower != null && <SpecRow label="Power" value={`${vehicle.specs.horsepower} hp`} />}
            {vehicle.specs.zeroToSixtySec != null && <SpecRow label="0–60 mph" value={`${vehicle.specs.zeroToSixtySec}s`} />}
            {vehicle.specs.cylinders != null && <SpecRow label="Cylinders" value={vehicle.specs.cylinders} />}
          </div>

          {vehicle.description && (
            <div className="border-border-soft border-t pt-3.5">
              <p className="text-meta text-fg-3 mb-1.5">Description</p>
              <p className="text-[13px]" style={{ textWrap: 'pretty' }}>
                {vehicle.description}
              </p>
            </div>
          )}

          {vehicle.photos.length > 0 && (
            <div className="border-border-soft border-t pt-3.5">
              <p className="text-meta text-fg-3 mb-2">Photos ({vehicle.photos.length})</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {vehicle.photos.map((photo) => (
                  <div key={photo.id} className="border-border aspect-square overflow-hidden rounded-[7px] border">
                    <img src={photo.url} alt={photo.name} className="size-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-4">
          <Card className="flex flex-col gap-3 p-[18px]">
            <PanelHeading title="Utilization" description="Last 30 days" />
            <div className="flex items-center gap-3">
              <Gauge className="text-fg-4 size-[18px]" />
              <span className="text-stat-md">{pct}%</span>
            </div>
            <span className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
              <span
                className="block h-full rounded-full"
                style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--color-success)' : pct >= 40 ? 'var(--color-warning)' : 'var(--color-error)' }}
              />
            </span>
          </Card>

          <Card className="flex flex-col gap-3 p-[18px]">
            <PanelHeading title="Location" />
            <div className="flex items-center gap-2.5">
              <MapPin className="text-fg-4 size-[18px] shrink-0" />
              <span className="text-[13.5px] font-semibold">{vehicle.location}</span>
            </div>
          </Card>

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
            {vehicle.fees.deposit != null && <SpecRow label="Deposit" value={formatCurrency(vehicle.fees.deposit)} />}
            {vehicle.fees.overageRatePerMile != null && (
              <SpecRow label="Overage rate" value={`${formatCurrency(vehicle.fees.overageRatePerMile)}/mi`} />
            )}
            {vehicle.fees.fuelChargeRate != null && (
              <SpecRow label="Fuel charge" value={`${formatCurrency(vehicle.fees.fuelChargeRate)} / 1/8 tank`} />
            )}
            {vehicle.fees.taxRatePct != null && <SpecRow label="Tax rate" value={`${vehicle.fees.taxRatePct}%`} />}
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
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete vehicle?"
        description={`${vehicleDisplayName(vehicle)} (${vehicle.plate}) will be removed from the fleet. This can't be undone.`}
        confirmLabel="Delete vehicle"
        loading={deleteVehicle.isPending}
        onConfirm={() => {
          deleteVehicle.mutate(vehicle, { onSuccess: () => navigate('/app/vehicles') })
        }}
      />
    </PageContainer>
  )
}
