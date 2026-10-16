import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Sparkline } from '@/components/data-display/Sparkline'
import { cn } from '@/lib/utils'

type KpiTone = 'up' | 'down' | 'neutral'

export interface KpiDef {
  id: string
  icon: LucideIcon
  label: string
  value: string
  /** A trend icon follows the tone; `icon` replaces it where the pill counts something instead. */
  badge?: { text: string; tone: KpiTone; icon?: LucideIcon }
  note?: string
  /** Sparkline points, from `sparkPoints`. */
  spark?: string
  /** A series that never moved: drawn grey, since green or red would claim a trend. */
  sparkFlat?: boolean
}

const TONE: Record<KpiTone, { bg: string; fg: string; icon?: LucideIcon }> = {
  up: { bg: 'var(--color-success-tint)', fg: 'var(--color-success)', icon: TrendingUp },
  down: { bg: 'var(--color-error-tint)', fg: 'var(--color-error)', icon: TrendingDown },
  neutral: { bg: 'var(--color-surface-3)', fg: 'var(--color-fg-2)' },
}

export function KpiCard({ icon: Icon, label, value, badge, note, spark, sparkFlat }: KpiDef) {
  const tone = TONE[badge?.tone ?? 'up']
  const BadgeIcon = badge?.icon ?? tone.icon
  const sparkColor = sparkFlat
    ? 'var(--color-border-strong)'
    : badge?.tone === 'down'
      ? 'var(--color-error)'
      : 'var(--color-success)'

  return (
    <Card hoverable className="flex flex-col gap-2.5 px-4 pt-[15px] pb-3">
      <div className="flex items-center gap-2">
        <Icon className="text-fg-4 size-[15px]" />
        <span className="text-fg-3 text-xs font-semibold">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-stat-lg tabular-nums">{value}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {badge && (
              <span
                className={cn(
                  'inline-flex items-center gap-[3px] rounded-full py-px text-[11.5px] font-semibold tabular-nums',
                  // The icon side is tighter, as the icon carries its own space.
                  BadgeIcon ? 'pr-1.5 pl-1' : 'px-1.5',
                )}
                style={{ background: tone.bg, color: tone.fg }}
              >
                {BadgeIcon && <BadgeIcon className="size-[11px]" strokeWidth={2.75} />}
                {badge.text}
              </span>
            )}
            {note && <span className="text-fg-4 text-[11.5px]">{note}</span>}
          </div>
        </div>
        {spark && <Sparkline points={spark} color={sparkColor} />}
      </div>
    </Card>
  )
}
