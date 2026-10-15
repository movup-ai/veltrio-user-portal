import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { useUpdateAdditionalDriverPrice } from '../hooks/use-company'
import type { Company } from '../types/company.types'
import { SettingsCard } from './SettingsCard'

/** What the field holds while it is being typed: empty is not a number yet. */
function typed(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value)
}

/** Whole cents at most, and never below zero. */
function validPrice(price: number): boolean {
  return Number.isFinite(price) && price >= 0 && Math.round(price * 100) === price * 100
}

/**
 * The company's price per day for each driver besides the renter. Staff start from it at the
 * counter, and renters who name a driver on the marketplace are charged it.
 */
export function AdditionalDriverCard({ company }: { company: Company }) {
  const { t } = useTranslation('settings')
  const update = useUpdateAdditionalDriverPrice()
  const saved = company.additionalDriverPrice
  const [value, setValue] = useState(String(saved))
  const [attempted, setAttempted] = useState(false)
  // The saved price the field was last taken from.
  const [synced, setSynced] = useState(saved)

  const price = typed(value)
  // A field nobody has changed follows a newer price; an edited one keeps what was typed.
  if (saved !== synced) {
    if (price === synced) setValue(String(saved))
    setSynced(saved)
  }
  const valid = validPrice(price)

  async function submit(event?: React.BaseSyntheticEvent) {
    event?.preventDefault()
    setAttempted(true)
    if (!valid) return
    // A failure is toasted by the hook, and the card keeps what was typed.
    await update.mutateAsync(price).then(
      () => setAttempted(false),
      () => undefined,
    )
  }

  return (
    <SettingsCard
      title={t('payments.drivers.title')}
      description={t('payments.drivers.description')}
      onSubmit={submit}
      onDiscard={() => {
        setValue(String(saved))
        setAttempted(false)
      }}
      dirty={price !== saved}
      saving={update.isPending}
    >
      <FormField
        label={t('payments.drivers.label')}
        description={t('payments.drivers.hint')}
        error={attempted && !valid ? t('payments.drivers.invalid') : undefined}
      >
        {(field) => (
          <div className="relative">
            <Input
              {...field}
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              className="pr-14"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <span className="text-fg-4 pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px]">
              {t('payments.drivers.perDaySuffix')}
            </span>
          </div>
        )}
      </FormField>
    </SettingsCard>
  )
}
