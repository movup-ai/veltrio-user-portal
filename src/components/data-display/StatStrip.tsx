import type { LucideIcon } from 'lucide-react'

export interface StatDef {
  icon: LucideIcon
  label: string
  value: string
  note: string
}

export function StatStrip({ stats }: { stats: StatDef[] }) {
  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      {stats.map((s) => (
        <div key={s.label} className="bg-surface border-border shadow-xs rounded-xl border px-4 py-3.5">
          <div className="flex items-center gap-2">
            <s.icon className="text-fg-4 size-3.5" />
            <span className="text-fg-3 text-xs font-semibold">{s.label}</span>
          </div>
          <div className="mt-2 text-[23px] font-bold tracking-tight tabular-nums">{s.value}</div>
          <div className="text-fg-4 mt-[3px] text-[11.5px]">{s.note}</div>
        </div>
      ))}
    </div>
  )
}
