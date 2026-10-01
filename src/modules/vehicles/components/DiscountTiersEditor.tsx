import { useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { DiscountTierValues, VehicleFormValues } from '../schema/vehicle.schema'

const ROW_GRID = 'grid grid-cols-[112px_minmax(0,1fr)_96px_40px] items-start gap-x-3'

interface DiscountTiersEditorProps {
  value: DiscountTierValues[]
  onChange: (tiers: DiscountTierValues[]) => void
  errors?: FieldErrors<VehicleFormValues>['discountTiers']
  /** Once the user has tried to leave this step, show every remaining error — not just touched fields. */
  showAllErrors?: boolean
}

/** Length-of-rental discounts: "3+ days, 10% off". The cost engine applies the highest one reached. */
export function DiscountTiersEditor({ value, onChange, errors, showAllErrors }: DiscountTiersEditorProps) {
  const { t } = useTranslation('vehicles')
  const [touched, setTouched] = useState<Set<string>>(new Set())
  // A new row opens with its threshold focused, so adding a tier is type-and-tab.
  const focusOnMount = useRef<string | null>(null)

  const update = (id: string, patch: Partial<DiscountTierValues>) => {
    onChange(value.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier)))
  }

  const add = () => {
    const id = crypto.randomUUID()
    focusOnMount.current = id
    onChange([...value, { id, minDays: Number.NaN, percentOff: Number.NaN }])
  }

  const markTouched = (id: string, field: string) => {
    setTouched((prev) => (prev.has(`${id}:${field}`) ? prev : new Set(prev).add(`${id}:${field}`)))
  }

  const errorFor = (tier: DiscountTierValues, index: number, field: 'minDays' | 'percentOff') => {
    if (!Array.isArray(errors)) return undefined
    if (!showAllErrors && !touched.has(`${tier.id}:${field}`)) return undefined
    return errors[index]?.[field]?.message
  }

  return (
    <div className="flex flex-col gap-2.5">
      {value.length > 0 && (
        <div className={cn(ROW_GRID, 'text-meta text-fg-3 px-3.5')}>
          <span>{t('discounts.when')}</span>
          <span>{t('discounts.description')}</span>
          <span>{t('discounts.discount')}</span>
          <span />
        </div>
      )}

      {value.map((tier, index) => {
        const daysError = errorFor(tier, index, 'minDays')
        const percentError = errorFor(tier, index, 'percentOff')
        const daysKnown = Number.isInteger(tier.minDays) && tier.minDays > 0

        return (
          <div
            key={tier.id}
            className={cn(ROW_GRID, 'border-border bg-surface-2 rounded-[9px] border p-3.5')}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Input
                  ref={(el) => {
                    if (!el || focusOnMount.current !== tier.id) return
                    focusOnMount.current = null
                    el.focus()
                  }}
                  aria-label={t('discounts.daysLabel')}
                  type="number"
                  className="w-[64px] px-2 text-center"
                  value={Number.isNaN(tier.minDays) ? '' : tier.minDays}
                  invalid={Boolean(daysError)}
                  onChange={(e) => update(tier.id, { minDays: e.target.valueAsNumber })}
                  onBlur={() => markTouched(tier.id, 'minDays')}
                />
                <span className="text-fg-3 text-[12.5px]">{t('discounts.daysSuffix')}</span>
              </div>
              {daysError && <p className="text-error text-[12px]">{daysError}</p>}
            </div>

            <p className={cn('text-[13px] lg:leading-9', daysKnown ? 'text-fg-2' : 'text-fg-4 italic')}>
              {daysKnown
                ? t('discounts.describe', { count: tier.minDays })
                : t('discounts.describePlaceholder')}
            </p>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Input
                  aria-label={t('discounts.percentLabel')}
                  type="number"
                  className="w-[60px] px-2 text-center"
                  value={Number.isNaN(tier.percentOff) ? '' : tier.percentOff}
                  invalid={Boolean(percentError)}
                  onChange={(e) => update(tier.id, { percentOff: e.target.valueAsNumber })}
                  onBlur={() => markTouched(tier.id, 'percentOff')}
                />
                <span className="text-fg-3 text-[12.5px]">%</span>
              </div>
            </div>

            <div className="flex h-9 items-center justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('discounts.remove', {
                  label: daysKnown
                    ? t('discounts.tierName', { count: tier.minDays })
                    : t('discounts.tierFallback'),
                })}
                className="text-fg-4 hover:text-error size-8"
                onClick={() => onChange(value.filter((other) => other.id !== tier.id))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        )
      })}

      <Button type="button" variant="outline" className="gap-1.5 self-start" onClick={add}>
        <Plus className="size-4" />
        {t('discounts.add')}
      </Button>
    </div>
  )
}
