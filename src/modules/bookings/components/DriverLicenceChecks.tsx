import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/forms/FormField'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import type { DriverCheckDraft, DriverCheckProblem } from '../utils/booking.handover'

interface DriverLicenceChecksProps {
  drafts: DriverCheckDraft[]
  onChange: (drafts: DriverCheckDraft[]) => void
  /** Shown once the counter has tried to hand the car over. */
  problems: Record<string, DriverCheckProblem>
}

/**
 * Each additional driver's licence, read off the card at pickup: what the renter gave is filled
 * in, the rest is typed, and a tick says the card was seen. It is the record the law asks for.
 */
export function DriverLicenceChecks({ drafts, onChange, problems }: DriverLicenceChecksProps) {
  const { t } = useTranslation('bookings')
  const update = (id: string, change: Partial<DriverCheckDraft>) =>
    onChange(
      drafts.map((draft) =>
        draft.id === id
          ? // A detail changed after the tick was not the one seen: it has to be ticked again.
            { ...draft, ...change, checked: change.checked ?? false }
          : draft,
      ),
    )

  return (
    <fieldset className="border-border-soft m-0 flex flex-col gap-3 rounded-[10px] border p-3.5">
      <legend className="text-label px-1">{t('details.condition.drivers.title')}</legend>
      <p className="text-description m-0">{t('details.condition.drivers.hint')}</p>
      {drafts.map((draft) => {
        const problem = problems[draft.id]
        const field = (key: 'licenceNumber' | 'licenceState' | 'licenceExpiry') =>
          problem === 'incomplete' && !draft[key].trim()
        return (
          <div
            key={draft.id}
            className="border-border-soft flex flex-col gap-3 border-t pt-3 first-of-type:border-0"
          >
            <p className="m-0 text-[14px] font-semibold">{draft.name}</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_88px_1fr]">
              <FormField label={t('details.condition.drivers.number')}>
                {(props) => (
                  <Input
                    {...props}
                    invalid={field('licenceNumber')}
                    className="font-mono"
                    autoComplete="off"
                    value={draft.licenceNumber}
                    onChange={(event) => update(draft.id, { licenceNumber: event.target.value })}
                  />
                )}
              </FormField>
              <FormField label={t('details.condition.drivers.state')}>
                {(props) => (
                  <Input
                    {...props}
                    invalid={field('licenceState')}
                    autoComplete="off"
                    value={draft.licenceState}
                    onChange={(event) => update(draft.id, { licenceState: event.target.value })}
                  />
                )}
              </FormField>
              <FormField label={t('details.condition.drivers.expiry')}>
                {({ id }) => (
                  <DatePicker
                    id={id}
                    aria-label={t('details.condition.drivers.expiryFor', { name: draft.name })}
                    value={draft.licenceExpiry}
                    onChange={(licenceExpiry) => update(draft.id, { licenceExpiry })}
                    placeholder={t('details.condition.drivers.expiryPlaceholder')}
                    invalid={field('licenceExpiry') || problem === 'expired'}
                  />
                )}
              </FormField>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
              <Checkbox
                checked={draft.checked}
                onCheckedChange={(checked) => update(draft.id, { checked: checked === true })}
                aria-invalid={problem === 'unchecked' || undefined}
              />
              {t('details.condition.drivers.seen', { name: draft.name })}
            </label>
            {problem && (
              <p role="alert" className="text-caption text-error m-0">
                {t(`details.condition.drivers.problem.${problem}`, { name: draft.name })}
              </p>
            )}
          </div>
        )
      })}
      <p className="text-caption text-fg-3 m-0">{t('details.condition.drivers.absent')}</p>
    </fieldset>
  )
}
