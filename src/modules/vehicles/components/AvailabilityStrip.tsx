import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useFormatters } from '@/i18n'
import { cn } from '@/lib/utils'
import { availabilityForVehicle, nextAvailableDay, type BusyInterval, type DayState } from '../utils/availability'
import type { Vehicle } from '../types/vehicle.types'

const STATE_STYLES: Record<DayState, string> = {
  booked: 'bg-tint text-primary border-transparent',
  available: 'bg-surface-3 text-fg-3 border-transparent',
  disabled: 'bg-warning-tint text-warning border-transparent',
}

const LEGEND: DayState[] = ['booked', 'available', 'disabled']

export function AvailabilityStrip({ vehicle, busy = [] }: { vehicle: Vehicle; busy?: BusyInterval[] }) {
  const { t } = useTranslation('vehicles')
  const format = useFormatters()
  const navigate = useNavigate()
  const days = availabilityForVehicle(vehicle, busy)
  const availableCount = days.filter((d) => d.state === 'available').length
  const nextAvailable = nextAvailableDay(days)

  // Sunday-first initials, localized — "S,M,T,W,T,F,S" in English, "D,L,M,X,J,V,S" in Spanish.
  const dayInitials = t('availability.dayInitials').split(',')

  const description = [
    t('availability.next14Days'),
    t('availability.availableDays', { count: availableCount }),
    nextAvailable
      ? t('availability.nextGap', { date: format.shortDate(nextAvailable.date) })
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
          onClick={() => navigate('/app/bookings', { state: { vehicleId: vehicle.id } })}
        />
      </div>

      <div className="vx-scroll overflow-x-auto">
        <div className="flex min-w-[700px] gap-2">
          {days.map((day) => (
            <div key={day.date.toISOString()} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-fg-4 text-[11px]">{dayInitials[day.date.getDay()]}</span>
              <span
                title={`${format.shortDate(day.date)} · ${t(`availability.state.${day.state}`)}`}
                className={cn(
                  'flex aspect-square w-full items-center justify-center rounded-[9px] border text-[14px] font-semibold tabular-nums',
                  STATE_STYLES[day.state],
                  day.isToday && '!border-foreground',
                )}
              >
                {day.date.getDate()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-border-soft text-fg-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3.5 text-[12px]">
        {LEGEND.map((state) => (
          <span key={state} className="flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-[3px]', STATE_STYLES[state])} aria-hidden />
            {t(`availability.state.${state}`)}
          </span>
        ))}
      </div>
    </Card>
  )
}
