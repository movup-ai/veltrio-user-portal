import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/switch'
import { VEHICLE_FEATURE_ICONS } from '../data/vehicle-features'
import { VEHICLE_FEATURES, type VehicleFeature } from '../types/vehicle.types'

interface VehicleFeaturesPickerProps {
  selected: VehicleFeature[]
  onChange: (next: VehicleFeature[]) => void
}

/** Toggle list of renter-facing amenities, used by the Add/Edit vehicle wizard. */
export function VehicleFeaturesPicker({ selected, onChange }: VehicleFeaturesPickerProps) {
  const { t } = useTranslation('vehicles')

  function toggle(feature: VehicleFeature, on: boolean) {
    // Rebuilt from VEHICLE_FEATURES so the saved order is always canonical, not click order.
    onChange(VEHICLE_FEATURES.filter((f) => (f === feature ? on : selected.includes(f))))
  }

  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      {VEHICLE_FEATURES.map((feature) => {
        const Icon = VEHICLE_FEATURE_ICONS[feature]
        const checked = selected.includes(feature)

        return (
          <label
            key={feature}
            className="border-border bg-surface hover:border-border-strong flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 transition-colors"
          >
            <span className="bg-surface-3 text-fg-3 flex size-8 shrink-0 items-center justify-center rounded-[8px]">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold">{t(`features.${feature}.label`)}</span>
              <span className="text-fg-4 block truncate text-[11.5px]">{t(`features.${feature}.description`)}</span>
            </span>
            <Switch checked={checked} onCheckedChange={(on) => toggle(feature, on)} />
          </label>
        )
      })}
    </div>
  )
}
