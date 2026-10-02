import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ClockAlert, ReceiptText, type LucideIcon } from 'lucide-react'
import { OPS, type OpKey } from '../mock/dashboard.mock'

const OP_STYLE: Record<OpKey, { icon: LucideIcon; color: string; tint: string }> = {
  pickupsToday: { icon: ArrowUpRight, color: 'var(--color-primary)', tint: 'var(--color-tint)' },
  returnsToday: { icon: ArrowDownLeft, color: 'var(--color-info)', tint: 'var(--color-info-tint)' },
  overdueReturns: { icon: ClockAlert, color: 'var(--color-error)', tint: 'var(--color-error-tint)' },
  unpaidInvoices: { icon: ReceiptText, color: 'var(--color-warning)', tint: 'var(--color-warning-tint)' },
}

export function OpsRow() {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
      {OPS.map((op) => {
        const style = OP_STYLE[op.key]
        return (
          <button
            key={op.key}
            type="button"
            onClick={() => navigate(op.target === 'Payments' ? '/payments' : '/bookings')}
            className="bg-surface border-border shadow-xs hover:bg-surface-2 flex items-center gap-3 rounded-xl border px-4 py-[15px] text-left transition-colors"
          >
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px]" style={{ background: style.tint, color: style.color }}>
              <style.icon className="size-[17px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[21px] leading-[1.1] font-bold tracking-[-0.02em] tabular-nums" style={{ color: style.color }}>
                {op.count}
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
