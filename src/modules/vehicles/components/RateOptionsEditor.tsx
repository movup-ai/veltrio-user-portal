import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { FieldErrors } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  BILLING_BASES,
  BILLING_BASIS_LABELS,
  DURATION_UNITS,
  type BillingBasis,
  type DurationUnit,
} from '../types/vehicle.types'
import type { RateOptionValues, VehicleFormValues } from '../schema/vehicle.schema'

const BASIS_HINT: Record<BillingBasis, string> = {
  hour: 'Charged hourly',
  day: 'Most common',
  week: 'Charged weekly',
  month: 'Long-term',
  fixed: 'Flat rate · set duration',
}

/** Shared grid so the header labels line up with each row's controls. The 1px column is the pricing | mileage divider. */
const ROW_GRID = 'grid grid-cols-1 gap-x-3 gap-y-2 lg:grid-cols-[1.25fr_1.6fr_0.85fr_1px_1fr_92px_40px] lg:items-start'

function newRateOption(): RateOptionValues {
  return {
    id: crypto.randomUUID(),
    label: '',
    basis: 'day',
    rate: Number.NaN,
    includedMiles: undefined,
    unlimitedMileage: false,
  }
}

interface RateOptionsEditorProps {
  value: RateOptionValues[]
  onChange: (options: RateOptionValues[]) => void
  errors?: FieldErrors<VehicleFormValues>['rateOptions']
  rootError?: string
  /** Once the user has tried to leave this step, show every remaining error — not just touched fields. */
  showAllErrors?: boolean
}

export function RateOptionsEditor({ value, onChange, errors, rootError, showAllErrors }: RateOptionsEditorProps) {
  // A freshly-added row shouldn't flash "required" errors before the user has touched it —
  // only surface a field's error once it's been blurred, or once showAllErrors kicks in.
  const [touched, setTouched] = useState<Set<string>>(new Set())

  const update = (id: string, patch: Partial<RateOptionValues>) => {
    onChange(value.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  const markTouched = (id: string, field: string) => {
    setTouched((prev) => {
      const key = `${id}:${field}`
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }

  const errorFor = (option: RateOptionValues, index: number, field: keyof RateOptionValues): string | undefined => {
    if (!Array.isArray(errors)) return undefined
    if (!showAllErrors && !touched.has(`${option.id}:${field}`)) return undefined
    return (errors[index] as Record<string, { message?: string }> | undefined)?.[field]?.message
  }

  if (value.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="border-border-strong flex flex-col items-center justify-center gap-2 rounded-[9px] border border-dashed px-6 py-10 text-center">
          <p className="text-[13.5px] font-semibold">No rate options yet</p>
          <p className="text-fg-3 max-w-md text-[12.5px]">
            Each option is one way a renter can book this vehicle — Daily, Weekly, a Weekend Package. Add at least one
            to make the vehicle bookable.
          </p>
          <Button type="button" variant="outline" className="mt-1.5 gap-1.5" onClick={() => onChange([newRateOption()])}>
            <Plus className="size-4" />
            Add rate option
          </Button>
        </div>
        {rootError && (
          <p role="alert" className="text-error text-[12.5px]">
            {rootError}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className={cn(ROW_GRID, 'text-meta text-fg-3 hidden px-3.5 lg:grid')}>
        <span>Label</span>
        <span>Billing basis</span>
        <span>Rate (USD)</span>
        <span className="bg-border h-3.5 justify-self-center" aria-hidden />
        <span>Included miles</span>
        <span>Unlimited</span>
        <span />
      </div>

      {value.map((option, index) => {
        const labelError = errorFor(option, index, 'label')
        const rateError = errorFor(option, index, 'rate')
        const durationError = errorFor(option, index, 'blockDuration')

        return (
          <div key={option.id} className={cn(ROW_GRID, 'border-border bg-surface-2 rounded-[9px] border p-3.5')}>
            <div className="flex flex-col gap-1">
              <span className="text-meta text-fg-3 lg:hidden">Label</span>
              <Input
                aria-label="Label"
                placeholder="e.g. Weekend Package"
                value={option.label}
                invalid={Boolean(labelError)}
                onChange={(e) => update(option.id, { label: e.target.value })}
                onBlur={() => markTouched(option.id, 'label')}
              />
              {labelError && <p className="text-error text-[12px]">{labelError}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-meta text-fg-3 lg:hidden">Billing basis</span>
              <div className="flex gap-2">
                <Select
                  value={option.basis}
                  onValueChange={(basis) =>
                    update(option.id, {
                      basis: basis as BillingBasis,
                      ...(basis === 'fixed'
                        ? {
                            blockDuration: option.blockDuration ?? 3,
                            blockDurationUnit: option.blockDurationUnit ?? 'days',
                          }
                        : { blockDuration: undefined, blockDurationUnit: undefined }),
                    })
                  }
                >
                  <SelectTrigger aria-label="Billing basis" className="min-w-0 flex-1">
                    {/* Explicit children (not the default mirrored item content) so the hint text doesn't bleed into the closed trigger. */}
                    <SelectValue>{BILLING_BASIS_LABELS[option.basis]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_BASES.map((basis) => (
                      <SelectItem key={basis} value={basis}>
                        <span className="flex w-full items-center justify-between gap-6">
                          {BILLING_BASIS_LABELS[basis]}
                          <span className="text-fg-4 text-[11.5px]">{BASIS_HINT[basis]}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {option.basis === 'fixed' && (
                  <>
                    <Input
                      aria-label="Block duration"
                      type="number"
                      className="w-[58px] shrink-0 px-2 text-center"
                      value={option.blockDuration ?? ''}
                      invalid={Boolean(durationError)}
                      onChange={(e) => update(option.id, { blockDuration: e.target.valueAsNumber })}
                      onBlur={() => markTouched(option.id, 'blockDuration')}
                    />
                    <Select
                      value={option.blockDurationUnit ?? 'days'}
                      onValueChange={(unit) => update(option.id, { blockDurationUnit: unit as DurationUnit })}
                    >
                      <SelectTrigger aria-label="Duration unit" className="w-[86px] shrink-0 px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              {durationError && <p className="text-error text-[12px]">{durationError}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-meta text-fg-3 lg:hidden">Rate (USD)</span>
              <Input
                aria-label="Rate (USD)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={Number.isNaN(option.rate) ? '' : option.rate}
                invalid={Boolean(rateError)}
                onChange={(e) => update(option.id, { rate: e.target.valueAsNumber })}
                onBlur={() => markTouched(option.id, 'rate')}
              />
              {rateError && <p className="text-error text-[12px]">{rateError}</p>}
            </div>

            <div className="bg-border hidden h-9 justify-self-center lg:block" aria-hidden />

            <div className="flex flex-col gap-1">
              <span className="text-meta text-fg-3 lg:hidden">
                Included miles {option.basis === 'fixed' ? '(total)' : `(per ${option.basis})`}
              </span>
              <Input
                aria-label={`Included miles ${option.basis === 'fixed' ? '(total)' : `(per ${option.basis})`}`}
                type="number"
                placeholder={option.unlimitedMileage ? 'Unlimited' : 'e.g. 200'}
                disabled={option.unlimitedMileage}
                value={option.includedMiles ?? ''}
                onChange={(e) => update(option.id, { includedMiles: e.target.valueAsNumber })}
              />
            </div>

            <div className="flex items-center gap-2 lg:h-9">
              <Switch
                aria-label="Unlimited miles"
                checked={option.unlimitedMileage}
                onCheckedChange={(checked) =>
                  update(option.id, { unlimitedMileage: checked, ...(checked ? { includedMiles: undefined } : {}) })
                }
              />
              <span className="text-fg-3 text-[12.5px] lg:hidden">Unlimited miles</span>
            </div>

            <div className="flex lg:h-9 lg:items-center lg:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${option.label || 'rate option'}`}
                className="text-fg-4 hover:text-error size-8"
                onClick={() => onChange(value.filter((o) => o.id !== option.id))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        className="gap-1.5 self-start"
        onClick={() => onChange([...value, newRateOption()])}
      >
        <Plus className="size-4" />
        Add rate option
      </Button>

      {rootError && (
        <p role="alert" className="text-error text-[12.5px]">
          {rootError}
        </p>
      )}
    </div>
  )
}
