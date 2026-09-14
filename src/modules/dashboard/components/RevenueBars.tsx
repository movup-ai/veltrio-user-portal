import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { REVENUE_14D } from '../mock/dashboard.mock'

export function RevenueBars() {
  const max = Math.max(...REVENUE_14D)

  return (
    <Card className="flex min-w-0 flex-[2_1_340px] flex-col px-[18px] pt-[18px] pb-3.5">
      <div className="flex flex-wrap items-start gap-3.5">
        <PanelHeading title="Revenue" description="Daily gross, last 14 days" className="min-w-0 flex-1" />
        <div className="text-right">
          <div className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.02em] tabular-nums">
            $71,540
          </div>
          <div className="text-fg-3 text-[11.5px] tabular-nums">+9.8% vs. prior 14d</div>
        </div>
      </div>

      <div className="border-border mt-5 flex h-[168px] flex-1 items-end gap-[7px] border-b pb-0.5">
        {REVENUE_14D.map((v, i) => (
          <div
            key={i}
            title={`Sep ${i + 1} · $${Math.round(v * 1000).toLocaleString()}`}
            className="flex h-full min-w-0 flex-1 flex-col justify-end gap-[5px]"
          >
            <span className="text-fg-4 text-center text-[10px] tabular-nums" style={{ opacity: i % 2 === 0 ? 1 : 0 }}>
              {i + 1}
            </span>
            <span
              className={`hover:bg-primary block w-full rounded-t-[5px] rounded-b-[2px] transition-colors ${
                i >= REVENUE_14D.length - 3 ? 'bg-primary' : 'bg-bar-dim'
              }`}
              style={{ height: `${Math.round((v / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="text-fg-4 mt-2 flex justify-between font-mono text-[11px]">
        <span>1 Sep</span>
        <span>7 Sep</span>
        <span>14 Sep</span>
      </div>
    </Card>
  )
}
