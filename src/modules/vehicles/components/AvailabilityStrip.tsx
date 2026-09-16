import { useNavigate } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { cn } from '@/lib/utils'
import { availabilityForVehicle, nextAvailableDay, type DayState } from '../utils/availability'
import type { Vehicle } from '../types/vehicle.types'

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const STATE_STYLES: Record<DayState, string> = {
  booked: 'bg-tint text-primary border-transparent',
  available: 'bg-surface-3 text-fg-3 border-transparent',
  disabled: 'bg-warning-tint text-warning border-transparent',
}

const LEGEND: { state: DayState; label: string }[] = [
  { state: 'booked', label: 'Booked' },
  { state: 'available', label: 'Available' },
  { state: 'disabled', label: 'Disabled' },
]

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AvailabilityStrip({ vehicle }: { vehicle: Vehicle }) {
  const navigate = useNavigate()
  const days = availabilityForVehicle(vehicle)
  const availableCount = days.filter((d) => d.state === 'available').length
  const nextAvailable = nextAvailableDay(days)

  const description = [
    'Next 14 days',
    `${availableCount} available ${availableCount === 1 ? 'day' : 'days'}`,
    nextAvailable ? `next gap ${formatShortDate(nextAvailable.date)}` : 'fully booked',
  ].join(' · ')

  return (
    <Card className="flex flex-col gap-4 p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelHeading title="Availability" description={description} />
        <PageActionButton
          icon={CalendarDays}
          label="Open Calendar"
          className="!text-[11.5px]"
          onClick={() => navigate('/app/bookings', { state: { vehicleId: vehicle.id } })}
        />
      </div>

      <div className="vx-scroll overflow-x-auto">
        <div className="flex min-w-[700px] gap-2">
          {days.map((day) => (
            <div key={day.date.toISOString()} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-fg-4 text-[11px]">{DAY_INITIALS[day.date.getDay()]}</span>
              <span
                title={`${formatShortDate(day.date)} · ${day.state}`}
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
        {LEGEND.map((item) => (
          <span key={item.state} className="flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-[3px]', STATE_STYLES[item.state])} aria-hidden />
            {item.label}
          </span>
        ))}
      </div>
    </Card>
  )
}
