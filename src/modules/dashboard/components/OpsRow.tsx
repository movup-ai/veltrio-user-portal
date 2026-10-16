import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { LIST_ICON, type ListKey } from '../constants/dashboard.constants'

type OpKey = Extract<ListKey, 'pickups' | 'returns' | 'overdue' | 'requests'>

const OP_COLOR: Record<OpKey, { color: string; tint: string }> = {
  pickups: { color: 'var(--color-primary)', tint: 'var(--color-tint)' },
  returns: { color: 'var(--color-info)', tint: 'var(--color-info-tint)' },
  overdue: { color: 'var(--color-error)', tint: 'var(--color-error-tint)' },
  requests: { color: 'var(--color-warning)', tint: 'var(--color-warning-tint)' },
}

export interface OpDef {
  key: OpKey
  count?: number
  onClick: () => void
}

export function OpsRow({ ops }: { ops: OpDef[] }) {
  const { t } = useTranslation('dashboard')

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
      {ops.map((op) => {
        const { color, tint } = OP_COLOR[op.key]
        const Icon = LIST_ICON[op.key]
        return (
          <button
            key={op.key}
            type="button"
            onClick={op.onClick}
            className="bg-surface border-border shadow-xs hover:bg-surface-2 flex items-center gap-3 rounded-xl border px-4 py-[15px] text-left transition-colors"
          >
            <span
              className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px]"
              style={{ background: tint, color }}
            >
              <Icon className="size-[17px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block text-[21px] leading-[1.1] font-bold tracking-[-0.02em] tabular-nums"
                style={{ color }}
              >
                {op.count ?? '—'}
              </span>
              <span className="text-fg-3 mt-px block text-[12.5px]">{t(`ops.${op.key}`)}</span>
            </span>
            <ArrowRight className="text-border-strong size-[15px] shrink-0" />
          </button>
        )
      })}
    </div>
  )
}
