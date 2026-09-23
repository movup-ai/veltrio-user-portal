import { useState } from 'react'
import type { FieldError, Merge } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AdditionalDriverValues } from '../schema/booking.schema'
import { ADDITIONAL_DRIVER_PER_DAY } from '../utils/booking.pricing'

/** What RHF hands back for an array field: per-row errors, itself possibly undefined. */
type DriverRowErrors = Merge<
  FieldError,
  (Merge<FieldError, Record<keyof AdditionalDriverValues, FieldError | undefined>> | undefined)[]
>

interface AdditionalDriversEditorProps {
  value: AdditionalDriverValues[]
  onChange: (drivers: AdditionalDriverValues[]) => void
  errors?: DriverRowErrors
  /** Once the user has tried to leave this step, show every remaining error — not just touched fields. */
  showAllErrors?: boolean
}

/**
 * Repeatable list of drivers named on the agreement besides the main renter. Each carries its
 * own rate — set with a default when added, then freely editable — so the counter can waive
 * or discount one driver without an org-wide rate change. Controlled by value/onChange rather
 * than useFieldArray, matching RateOptionsEditor on the vehicle form.
 */
export function AdditionalDriversEditor({
  value,
  onChange,
  errors,
  showAllErrors,
}: AdditionalDriversEditorProps) {
  const { t } = useTranslation('bookings')
  // A freshly-added row shouldn't flash "required" errors before the user has touched it —
  // the form validates on change, so adding a blank row would otherwise light it up at once.
  // Matches RateOptionsEditor on the vehicle form.
  const [touched, setTouched] = useState<Set<string>>(new Set())

  const markTouched = (id: string, field: string) => {
    setTouched((prev) => {
      const key = `${id}:${field}`
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }

  function update(index: number, patch: Partial<AdditionalDriverValues>) {
    onChange(value.map((driver, i) => (i === index ? { ...driver, ...patch } : driver)))
  }

  function add() {
    onChange([
      ...value,
      { id: crypto.randomUUID(), name: '', licenceNumber: '', pricePerDay: ADDITIONAL_DRIVER_PER_DAY },
    ])
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 ? (
        <div className="border-border-strong text-fg-4 flex items-center gap-2.5 rounded-[9px] border border-dashed p-3.5 text-[13.5px]">
          <UserRound className="size-4 shrink-0" aria-hidden />
          {t('form.drivers.empty')}
        </div>
      ) : (
        value.map((driver, index) => {
          const rowErrors = errors?.[index]
          /** A row's error, withheld until that field is blurred or the step is submitted. */
          const errorFor = (field: keyof AdditionalDriverValues) =>
            showAllErrors || touched.has(`${driver.id}:${field}`)
              ? (rowErrors as Record<string, { message?: string }> | undefined)?.[field]?.message
              : undefined
          return (
            <div
              key={driver.id}
              className="border-border bg-surface-2 flex flex-col gap-3 rounded-[9px] border p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13.5px] font-semibold">
                  {t('form.drivers.driverN', { index: index + 1 })}
                </span>
                <button
                  type="button"
                  aria-label={t('form.drivers.remove', { index: index + 1 })}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  className="text-fg-4 hover:bg-surface-3 hover:text-error flex size-7 shrink-0 items-center justify-center rounded-[7px] transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${driver.id}-name`}>{t('form.drivers.name')}</Label>
                  <Input
                    id={`${driver.id}-name`}
                    // The visible label stays short; the accessible name says which driver,
                    // since the renter above has a "Full name" field too.
                    aria-label={t('form.drivers.nameFor', { index: index + 1 })}
                    value={driver.name}
                    invalid={Boolean(errorFor('name'))}
                    onBlur={() => markTouched(driver.id, 'name')}
                    onChange={(e) => update(index, { name: e.target.value })}
                  />
                  {errorFor('name') && (
                    <p role="alert" className="text-caption text-error">
                      {errorFor('name')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${driver.id}-licence`}>{t('form.drivers.licence')}</Label>
                  <Input
                    id={`${driver.id}-licence`}
                    className="font-mono"
                    aria-label={t('form.drivers.licenceFor', { index: index + 1 })}
                    value={driver.licenceNumber}
                    invalid={Boolean(errorFor('licenceNumber'))}
                    onBlur={() => markTouched(driver.id, 'licenceNumber')}
                    onChange={(e) => update(index, { licenceNumber: e.target.value })}
                  />
                  {errorFor('licenceNumber') && (
                    <p role="alert" className="text-caption text-error">
                      {errorFor('licenceNumber')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${driver.id}-rate`}>{t('form.drivers.rate')}</Label>
                  <div className="relative">
                    <Input
                      id={`${driver.id}-rate`}
                      type="number"
                      min={0}
                      step="0.01"
                      className="pr-14"
                      aria-label={t('form.drivers.rateFor', { index: index + 1 })}
                      value={driver.pricePerDay}
                      invalid={Boolean(errorFor('pricePerDay'))}
                      onBlur={() => markTouched(driver.id, 'pricePerDay')}
                      onChange={(e) => update(index, { pricePerDay: e.target.valueAsNumber })}
                    />
                    <span className="text-fg-4 pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px]">
                      {t('form.drivers.perDaySuffix')}
                    </span>
                  </div>
                  {errorFor('pricePerDay') && (
                    <p role="alert" className="text-caption text-error">
                      {errorFor('pricePerDay')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}

      <Button type="button" variant="outline" size="sm" onClick={add} className="w-fit gap-1.5">
        <Plus className="size-4" aria-hidden />
        {t('form.drivers.add')}
      </Button>
    </div>
  )
}
