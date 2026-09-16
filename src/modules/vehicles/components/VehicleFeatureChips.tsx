import { useTranslation } from 'react-i18next'
import { VEHICLE_FEATURE_ICONS } from '../data/vehicle-features'
import type { VehicleFeature } from '../types/vehicle.types'

/** Read-only chip list of a vehicle's amenities — shared by the details page and the form's Review step. */
export function VehicleFeatureChips({ features }: { features: VehicleFeature[] }) {
  const { t } = useTranslation('vehicles')

  return (
    <ul className="flex flex-wrap gap-2">
      {features.map((feature) => {
        const Icon = VEHICLE_FEATURE_ICONS[feature]

        return (
          <li
            key={feature}
            className="border-border bg-surface-2 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] font-medium"
          >
            {/* Label sits at full foreground to match surrounding values; the icon stays a step
                lighter so it reads as decoration rather than competing with the text. */}
            <Icon className="text-fg-3 size-3.5" aria-hidden />
            {t(`features.${feature}.label`)}
          </li>
        )
      })}
    </ul>
  )
}
