import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { ConditionPhoto } from '../types/booking.types'
import { BookingConditionPhotos } from './BookingConditionPhotos'

interface BookingTripCardProps {
  icon: LucideIcon
  label: string
  /** The headline moment — "Sep 14 · 09:30" for a pickup, "Sep 18" for a return. */
  when: string
  place: string
  rows: { label: string; value: string }[]
  /** The damage note and photos taken at this handover, once it is recorded and has either. */
  condition?: { label: string; notes?: string; photos: ConditionPhoto[] }
}

/** One end of the rental: when and where, its facts, and the car's condition as it changed hands. */
export function BookingTripCard({ icon: Icon, label, when, place, rows, condition }: BookingTripCardProps) {
  return (
    <Card as="section" className="flex flex-col p-[18px]">
      <div className="flex items-center gap-2.5">
        <span className="bg-tint text-primary flex size-7 shrink-0 items-center justify-center rounded-[8px]">
          <Icon className="size-4" aria-hidden />
        </span>
        <h2 className="text-panel-title m-0">{label}</h2>
      </div>

      <p className="m-0 mt-3 text-[19px] leading-tight font-bold">{when}</p>
      <p className="text-fg-4 m-0 mt-1 text-[12.5px]" style={{ textWrap: 'pretty' }}>
        {place}
      </p>

      <div className="border-border-soft divide-border-soft mt-3.5 flex flex-col divide-y border-t pt-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-fg-3 shrink-0 text-[13px]">{row.label}</span>
            <span className="min-w-0 truncate text-[13px] font-semibold">{row.value}</span>
          </div>
        ))}
      </div>

      {condition && (
        <div className="border-border-soft flex flex-col gap-2 border-t pt-2.5">
          <span className="text-fg-3 text-[13px]">{condition.label}</span>
          {condition.notes && <p className="m-0 text-[13px] whitespace-pre-line">{condition.notes}</p>}
          <BookingConditionPhotos photos={condition.photos} />
        </div>
      )}
    </Card>
  )
}
