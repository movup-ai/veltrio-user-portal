import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface BookingTripCardProps {
  icon: LucideIcon
  label: string
  /** The headline moment — "Sep 14 · 09:30" for a pickup, "Sep 18" for a return. */
  when: string
  place: string
  rows: { label: string; value: string }[]
}

/** One end of the rental: when, where, and the two facts the counter needs about it. */
export function BookingTripCard({ icon: Icon, label, when, place, rows }: BookingTripCardProps) {
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
    </Card>
  )
}
