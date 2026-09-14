import { useNavigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ClockAlert, ReceiptText, type LucideIcon } from 'lucide-react'
import { OPS } from '../mock/dashboard.mock'

const OP_STYLE: Record<string, { icon: LucideIcon; color: string; tint: string }> = {
  'Pickups today': { icon: ArrowUpRight, color: 'var(--color-primary)', tint: 'var(--color-tint)' },
  'Returns today': { icon: ArrowDownLeft, color: 'var(--color-info)', tint: 'var(--color-info-tint)' },
  'Overdue returns': { icon: ClockAlert, color: 'var(--color-error)', tint: 'var(--color-error-tint)' },
  'Unpaid invoices': { icon: ReceiptText, color: 'var(--color-warning)', tint: 'var(--color-warning-tint)' },
}

export function OpsRow() {
  const navigate = useNavigate()

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
      {OPS.map((op) => {
        const style = OP_STYLE[op.label]
        return (
          <button
            key={op.label}
            type="button"
            onClick={() => navigate(op.target === 'Payments' ? '/app/payments' : '/app/bookings')}
            className="bg-surface border-border shadow-xs hover:bg-surface-2 flex items-center gap-3 rounded-xl border px-4 py-[15px] text-left transition-colors"
          >
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px]" style={{ background: style.tint, color: style.color }}>
              <style.icon className="size-[17px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[21px] leading-[1.1] font-bold tracking-[-0.02em] tabular-nums" style={{ color: style.color }}>
                {op.count}
              </span>
              <span className="text-fg-3 mt-px block text-[12.5px]">{op.label}</span>
            </span>
            <ArrowRight className="text-border-strong size-[15px] shrink-0" />
          </button>
        )
      })}
    </div>
  )
}
