import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { cn } from '@/lib/utils'
import type { Vehicle } from '../types/vehicle.types'

interface SpecItem {
  label: string
  value: React.ReactNode
  mono?: boolean
  /** Reserved for the handful of fields used to identify/look up the vehicle (make, model, plate, VIN, mileage). */
  emphasize?: boolean
}

function SpecCell({ label, value, mono, emphasize }: SpecItem) {
  return (
    <div className="border-border-soft border-b pb-2.5">
      <p className="text-meta text-fg-3 mb-1">{label}</p>
      <p className={cn('text-[13.5px]', emphasize ? 'font-semibold' : 'font-normal', mono && 'font-mono')}>{value}</p>
    </div>
  )
}

export function VehicleSpecs({ vehicle }: { vehicle: Vehicle }) {
  const { specs } = vehicle

  // Labels mirror the Add/Edit vehicle form's field names exactly (VehicleFormPage), so this
  // panel reads as "what was entered" rather than a re-worded summary.
  const items: SpecItem[] = [
    { label: 'Make', value: vehicle.make, emphasize: true },
    { label: 'Model', value: vehicle.model, emphasize: true },
    { label: 'Vehicle type', value: vehicle.class },
    { label: 'Year', value: vehicle.year },
    { label: 'Color', value: vehicle.color },
    { label: 'Plate', value: vehicle.plate, emphasize: true },
    { label: 'VIN', value: vehicle.vin, emphasize: true },
    { label: 'Current mileage', value: `${vehicle.mileage.toLocaleString('en-US')} mi`, emphasize: true },
    { label: 'Transmission', value: specs.transmission },
    { label: 'Fuel type', value: specs.fuelType },
    { label: 'Seats', value: specs.seats },
    { label: 'Doors', value: specs.doors },
    ...(specs.topSpeedMph != null ? [{ label: 'Top speed', value: `${specs.topSpeedMph} mph` }] : []),
    ...(specs.horsepower != null ? [{ label: 'Power', value: `${specs.horsepower} hp` }] : []),
    ...(specs.zeroToSixtySec != null ? [{ label: '0–60 mph', value: `${specs.zeroToSixtySec}s` }] : []),
    ...(specs.cylinders != null ? [{ label: 'Cylinders', value: specs.cylinders }] : []),
  ]

  return (
    <Card className="flex flex-col gap-4 p-[18px]">
      <PanelHeading title="Specifications" description="Exactly as entered on the vehicle form" />
      <div className="grid gap-x-6 gap-y-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {items.map((item) => (
          <SpecCell key={item.label} {...item} />
        ))}
      </div>
    </Card>
  )
}
