import { ArrowRight, Clock, MapPin, UserRound } from 'lucide-react'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import type { Location } from '../types/location.types'

export function LocationCard({ location }: { location: Location }) {
  return (
    <div className="bg-surface border-border shadow-xs hover:border-border-strong hover:shadow-sm flex flex-col gap-3.5 rounded-xl border p-[18px] transition-[border-color,box-shadow]">
      <div className="flex items-start gap-3">
        <span className="bg-tint text-primary flex size-9 shrink-0 items-center justify-center rounded-[10px]">
          <MapPin className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-[15px] font-semibold">{location.name}</h3>
          <p className="text-fg-4 m-0 mt-[3px] text-[12.5px]" style={{ textWrap: 'pretty' }}>
            {location.address}
          </p>
        </div>
        <div className="shrink-0">
          <StatusBadge status={location.status} />
        </div>
      </div>

      <div className="border-border-soft grid grid-cols-3 gap-2.5 border-t border-b py-3">
        {location.metrics.map((m) => (
          <div key={m.label}>
            <div className="text-lg font-bold tracking-[-0.02em] tabular-nums">{m.value}</div>
            <div className="text-fg-4 mt-0.5 text-[11px]">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="text-fg-2 flex flex-col gap-[7px] text-[12.5px]">
        <div className="flex items-center gap-2">
          <Clock className="text-fg-4 size-3.5 shrink-0" />
          <span>{location.hours}</span>
        </div>
        <div className="flex items-center gap-2">
          <UserRound className="text-fg-4 size-3.5 shrink-0" />
          <span>{location.manager}</span>
        </div>
      </div>

      <button
        type="button"
        className="border-border text-fg-2 hover:bg-surface-2 hover:text-foreground mt-auto flex h-[34px] items-center justify-center gap-1.5 rounded-[9px] border text-[12.5px] font-semibold transition-colors"
      >
        <span>Manage location</span>
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  )
}
