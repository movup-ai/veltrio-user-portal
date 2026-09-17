import type { FieldError, Merge } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Plus, Receipt, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BookingFeeValues } from '../schema/booking.schema'

/** What RHF hands back for an array field: per-row errors, itself possibly undefined. */
type FeeRowErrors = Merge<FieldError, (Merge<FieldError, Record<keyof BookingFeeValues, FieldError | undefined>> | undefined)[]>

interface BookingFeesEditorProps {
  value: BookingFeeValues[]
  onChange: (fees: BookingFeeValues[]) => void
  errors?: FeeRowErrors
}

/**
 * Free-form one-off charges — cleaning, a negotiated add-on, anything outside the standard
 * rate. Each is a flat amount, not per-day, since there's no fixed catalog for these yet.
 * Same controlled-array shape as AdditionalDriversEditor.
 */
export function BookingFeesEditor({ value, onChange, errors }: BookingFeesEditorProps) {
  const { t } = useTranslation('bookings')

  function update(index: number, patch: Partial<BookingFeeValues>) {
    onChange(value.map((fee, i) => (i === index ? { ...fee, ...patch } : fee)))
  }

  function add() {
    onChange([...value, { id: crypto.randomUUID(), label: '', amount: 0 }])
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 ? (
        <div className="border-border-strong text-fg-4 flex items-center gap-2.5 rounded-[9px] border border-dashed p-3.5 text-[13.5px]">
          <Receipt className="size-4 shrink-0" aria-hidden />
          {t('form.fees.empty')}
        </div>
      ) : (
        value.map((fee, index) => {
          const rowErrors = errors?.[index]
          return (
            <div key={fee.id} className="flex items-start gap-2.5">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`${fee.id}-label`}>{t('form.fees.label')}</Label>
                <Input
                  id={`${fee.id}-label`}
                  aria-label={t('form.fees.labelFor', { index: index + 1 })}
                  placeholder={t('form.fees.labelPlaceholder')}
                  value={fee.label}
                  invalid={Boolean(rowErrors?.label)}
                  onChange={(e) => update(index, { label: e.target.value })}
                />
                {rowErrors?.label && (
                  <p role="alert" className="text-caption text-error">
                    {rowErrors.label.message}
                  </p>
                )}
              </div>

              <div className="flex w-36 shrink-0 flex-col gap-1.5">
                <Label htmlFor={`${fee.id}-amount`}>{t('form.fees.amount')}</Label>
                <Input
                  id={`${fee.id}-amount`}
                  type="number"
                  min={0}
                  step="0.01"
                  aria-label={t('form.fees.amountFor', { index: index + 1 })}
                  value={fee.amount}
                  invalid={Boolean(rowErrors?.amount)}
                  onChange={(e) => update(index, { amount: e.target.valueAsNumber })}
                />
                {rowErrors?.amount && (
                  <p role="alert" className="text-caption text-error">
                    {rowErrors.amount.message}
                  </p>
                )}
              </div>

              <button
                type="button"
                aria-label={t('form.fees.remove', { index: index + 1 })}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="text-fg-4 hover:bg-surface-3 hover:text-error mt-6 flex size-9 shrink-0 items-center justify-center rounded-[7px] transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )
        })
      )}

      <Button type="button" variant="outline" size="sm" onClick={add} className="w-fit gap-1.5">
        <Plus className="size-4" aria-hidden />
        {t('form.fees.add')}
      </Button>
    </div>
  )
}
