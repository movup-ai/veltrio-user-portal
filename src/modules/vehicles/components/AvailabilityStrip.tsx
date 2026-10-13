import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useFormatters } from '@/i18n'
import { cn } from '@/lib/utils'
import {
  availabilityForVehicle,
  nextAvailableDay,
  type BusyInterval,
  type DayState,
} from '../utils/availability'
import type { Vehicle } from '../types/vehicle.types'

const STATE_STYLES: Record<DayState, string> = {
  booked: 'bg-primary/80 text-primary-foreground border-transparent',
  pending: 'bg-warning-tint text-foreground border-warning border-dashed',
  available: 'bg-surface text-foreground border-border-strong',
  disabled: 'bg-surface-3 text-fg-4 border-border',
}

// A request holds nothing yet, so its days are hatched rather than filled like a booking's.
const HATCH =
  'repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in srgb, var(--color-warning) 32%, transparent) 5px 7px)'

function stateFill(state: DayState) {
  return state === 'pending' ? { backgroundImage: HATCH } : undefined
}

// Disabled is added only for a car that is off the road: otherwise it names a colour never shown.
const LEGEND: DayState[] = ['booked', 'pending', 'available']

// Read in UTC: each day's date holds the company's calendar day there.
const SHORT_DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }

export function AvailabilityStrip({ vehicle, busy = [] }: { vehicle: Vehicle; busy?: BusyInterval[] }) {
  const { t } = useTranslation('vehicles')
  const format = useFormatters()
  const navigate = useNavigate()
  const days = availabilityForVehicle(vehicle, busy)
  const availableCount = days.filter((d) => d.state === 'available').length
  const nextAvailable = nextAvailableDay(days)
  const legend: DayState[] = days.some((d) => d.state === 'disabled') ? [...LEGEND, 'disabled'] : LEGEND

  // Sunday-first initials, localized — "S,M,T,W,T,F,S" in English, "D,L,M,X,J,V,S" in Spanish.
  const dayInitials = t('availability.dayInitials').split(',')

  const description = [
    t('availability.next14Days'),
    t('availability.availableDays', { count: availableCount }),
    nextAvailable
      ? t('availability.nextGap', { date: format.date(nextAvailable.date, SHORT_DAY) })
      : t('availability.fullyBooked'),
  ].join(' · ')

  return (
    <Card className="flex flex-col gap-4 p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelHeading title={t('availability.title')} description={description} />
        <PageActionButton
          icon={CalendarDays}
          label={t('availability.openCalendar')}
          className="!text-[11.5px]"
          onClick={() => navigate('/calendar')}
        />
      </div>

      <div className="vx-scroll overflow-x-auto">
        <div className="flex min-w-[700px] gap-2">
          {days.map((day) => (
            <div key={day.date.toISOString()} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-fg-4 text-[11px]">{dayInitials[day.date.getUTCDay()]}</span>
              <span
                title={`${format.date(day.date, SHORT_DAY)} · ${t(`availability.state.${day.state}`)}`}
                className={cn(
                  'flex aspect-square w-full items-center justify-center rounded-[9px] border text-[14px] font-semibold tabular-nums',
                  STATE_STYLES[day.state],
                  day.isToday && '!border-foreground',
                )}
                style={stateFill(day.state)}
              >
                {day.date.getUTCDate()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ul
        aria-label={t('availability.legend')}
        className="border-border-soft text-fg-2 m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1.5 border-t p-0 pt-3.5 text-[12px]"
      >
        {legend.map((state) => (
          <li key={state} className="flex items-center gap-1.5">
            <span
              className={cn('size-3 rounded-[3px] border', STATE_STYLES[state])}
              style={stateFill(state)}
              aria-hidden
            />
            {t(`availability.state.${state}`)}
          </li>
        ))}
      </ul>
    </Card>
  )
}
