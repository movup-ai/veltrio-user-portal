import { useTranslation } from 'react-i18next'
import type { RateOption } from '../types/vehicle.types'
import { hourlyCapApplies } from '../utils/rate-plan'

interface HourlyCapNoteProps {
  options: Pick<RateOption, 'basis'>[]
  hoursPerDay: number
  className?: string
}

/** What limits a day of hourly billing: the automatic cap, or the vehicle's own Daily rate. */
export function HourlyCapNote({ options, hoursPerDay, className }: HourlyCapNoteProps) {
  const { t } = useTranslation('vehicles')

  if (!options.some((o) => o.basis === 'hour')) return null
  return (
    <p className={className}>
      {hourlyCapApplies(options)
        ? t('details.hourlyCap', { count: hoursPerDay })
        : t('details.hourlyCappedByDaily')}
    </p>
  )
}
