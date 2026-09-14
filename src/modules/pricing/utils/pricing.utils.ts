import type { Row } from '@/components/data-display/record-table.types'
import type { PricingTuple } from '../types/pricing.types'

export function pricingColumns() {
  return [
    { label: 'Rule', align: 'left' as const },
    { label: 'Applies to', align: 'left' as const },
    { label: 'Adjustment', align: 'left' as const },
    { label: 'Status', align: 'left' as const },
    { label: 'Enabled', align: 'left' as const },
    { label: '', align: 'right' as const },
  ]
}

export function pricingRow(p: PricingTuple): Row {
  const [rule, window, scope, adjustment, status, enabled] = p

  return {
    key: rule,
    cells: [
      { kind: 'stack', primary: rule, secondary: window, weight: 600, subFontMono: false },
      { kind: 'text', primary: scope },
      { kind: 'amount', primary: adjustment, tone: adjustment.charAt(0) === '−' ? 'var(--color-success)' : 'var(--color-foreground)' },
      { kind: 'badge', status },
      { kind: 'switch', on: enabled },
      { kind: 'actions', align: 'right' },
    ],
  }
}
