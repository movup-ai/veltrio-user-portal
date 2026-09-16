import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useDomainLabels } from '@/i18n/domain'
import { useFormatters } from '@/i18n'
import { cn } from '@/lib/utils'
import { VehicleFeatureChips } from './VehicleFeatureChips'
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
  const { t } = useTranslation('vehicles')
  const domain = useDomainLabels()
  const format = useFormatters()
  const { specs } = vehicle

  // Labels mirror the Add/Edit vehicle form's field names exactly (VehicleFormPage), so this
  // panel reads as "what was entered" rather than a re-worded summary.
  const items: SpecItem[] = [
    { label: t('specs.make'), value: vehicle.make, emphasize: true },
    { label: t('specs.model'), value: vehicle.model, emphasize: true },
    { label: t('specs.vehicleType'), value: domain.label('vehicleClass', vehicle.class) },
    { label: t('specs.year'), value: vehicle.year },
    { label: t('specs.color'), value: vehicle.color },
    { label: t('specs.plate'), value: vehicle.plate, emphasize: true },
    { label: t('specs.vin'), value: vehicle.vin, emphasize: true },
    { label: t('specs.currentMileage'), value: `${format.number(vehicle.mileage)} mi`, emphasize: true },
    { label: t('specs.transmission'), value: domain.label('transmission', specs.transmission) },
    { label: t('specs.fuelType'), value: domain.label('fuelType', specs.fuelType) },
    { label: t('specs.seats'), value: specs.seats },
    { label: t('specs.doors'), value: specs.doors },
  ]

  const features = vehicle.features ?? []

  return (
    <Card className="flex flex-col gap-4 p-[18px]">
      <PanelHeading title={t('specs.title')} description={t('specs.description')} />
      <div className="grid gap-x-6 gap-y-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {items.map((item) => (
          <SpecCell key={item.label} {...item} />
        ))}
      </div>

      <div className="border-border-soft flex flex-col gap-2.5 border-t pt-4">
        <p className="text-meta text-fg-3">{t('features.title')}</p>
        {features.length > 0 ? (
          <VehicleFeatureChips features={features} />
        ) : (
          <p className="text-fg-4 text-[13px]">{t('features.none')}</p>
        )}
      </div>
    </Card>
  )
}
