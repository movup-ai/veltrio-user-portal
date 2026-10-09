import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CancellationSchedule } from '@/components/data-display/CancellationSchedule'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  POLICY_CHOICES,
  POLICY_PRESETS,
  nextTier,
  policyChoice,
  samePolicy,
  tierProblems,
  type CancellationPolicy,
  type CancellationTier,
  type PolicyChoice,
} from '@/lib/cancellation-policy'
import { cn } from '@/lib/utils'
import { useUpdateCancellationPolicy } from '../hooks/use-company'
import type { Company } from '../types/company.types'
import { SettingsCard } from './SettingsCard'

/** What a number field holds while it is being typed: empty is not a number yet. */
function typed(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value)
}

function shown(value: number): string {
  return Number.isNaN(value) ? '' : String(value)
}

/**
 * The company's cancellation policy: none, one of three ready-made schedules, or its own tiers.
 * Renters are shown it before they pay, and it suggests the refund when a booking is cancelled.
 */
export function CancellationPolicyCard({ company }: { company: Company }) {
  const { t } = useTranslation('settings')
  const update = useUpdateCancellationPolicy()
  const saved = company.cancellationPolicy
  const [choice, setChoice] = useState<PolicyChoice>(policyChoice(saved))
  // The custom tiers, kept while a preset is looked at so switching back does not lose them.
  const [tiers, setTiers] = useState<CancellationPolicy>(saved ?? [...POLICY_PRESETS.standard])
  // Whether those tiers are the owner's own: saved as custom, or edited here. Until then
  // Custom starts from the schedule on screen; after, it must not overwrite their work.
  const [own, setOwn] = useState(policyChoice(saved) === 'custom')
  const [attempted, setAttempted] = useState(false)
  // The saved policy the fields above were last taken from.
  const [synced, setSynced] = useState(saved)

  const policy = choice === 'none' ? undefined : choice === 'custom' ? tiers : [...POLICY_PRESETS[choice]]
  // The company is shown from cache and then read again. A card nobody has changed follows the
  // newer policy: left on the old one, it would read as an edit and Save would put it back.
  if (!samePolicy(saved, synced)) {
    if (samePolicy(policy, synced)) showSaved()
    setSynced(saved)
  }
  const problems = choice === 'custom' ? tierProblems(tiers) : {}
  const valid = Object.keys(problems).length === 0
  const addable = nextTier(tiers)

  function choose(next: PolicyChoice) {
    if (next === 'custom' && !own && policy) setTiers(policy)
    setChoice(next)
    setAttempted(false)
  }

  function change(next: CancellationPolicy) {
    setTiers(next)
    setOwn(true)
  }

  function edit(index: number, changed: Partial<CancellationTier>) {
    change(tiers.map((tier, i) => (i === index ? { ...tier, ...changed } : tier)))
  }

  async function submit(event?: React.BaseSyntheticEvent) {
    event?.preventDefault()
    setAttempted(true)
    if (!valid) return
    // A failure is toasted by the hook, and the card keeps what was typed.
    await update.mutateAsync(policy).then(
      () => setAttempted(false),
      () => undefined,
    )
  }

  function showSaved() {
    setChoice(policyChoice(saved))
    setTiers(saved ?? [...POLICY_PRESETS.standard])
    setOwn(policyChoice(saved) === 'custom')
    setAttempted(false)
  }

  return (
    <SettingsCard
      title={t('payments.cancellation.title')}
      description={t('payments.cancellation.description')}
      onSubmit={submit}
      onDiscard={showSaved}
      dirty={!samePolicy(policy, saved)}
      saving={update.isPending}
      columns={1}
    >
      <RadioGroup
        aria-label={t('payments.cancellation.title')}
        value={choice}
        onValueChange={(value) => choose(value as PolicyChoice)}
        className="sm:grid-cols-2 lg:grid-cols-3"
      >
        {POLICY_CHOICES.map((value) => (
          <label
            key={value}
            className={cn(
              'flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5 transition-colors',
              choice === value ? 'border-primary bg-tint' : 'border-border hover:bg-surface-2',
            )}
          >
            <RadioGroupItem value={value} className="mt-0.5" />
            <span className="flex min-w-0 flex-col">
              <span className="text-[13px] font-semibold">
                {t(`payments.cancellation.choices.${value}.label`)}
              </span>
              <span className="text-fg-3 text-[12px]">
                {t(`payments.cancellation.choices.${value}.hint`)}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {choice === 'custom' && (
        <div className="flex flex-col gap-2">
          <p className="text-fg-3 m-0 text-[12.5px]">{t('payments.cancellation.customHint')}</p>
          {tiers.map((tier, index) => {
            const problem = attempted ? problems[index] : undefined
            return (
              // Tiers have no identity of their own, and editing one must not remount its inputs.
              <div key={index} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="text-fg-2">{t('payments.cancellation.tier.atLeast')}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    aria-label={t('payments.cancellation.tier.daysLabel', { number: index + 1 })}
                    invalid={problem === 'days' || problem === 'daysOrder'}
                    value={shown(tier.daysBefore)}
                    onChange={(event) => edit(index, { daysBefore: typed(event.target.value) })}
                    className="w-20 tabular-nums"
                  />
                  <span className="text-fg-2">{t('payments.cancellation.tier.daysBefore')}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="100"
                    aria-label={t('payments.cancellation.tier.percentLabel', { number: index + 1 })}
                    invalid={problem === 'percent' || problem === 'percentOrder'}
                    value={shown(tier.refundPercent)}
                    onChange={(event) => edit(index, { refundPercent: typed(event.target.value) })}
                    className="w-20 tabular-nums"
                  />
                  <span className="text-fg-2">{t('payments.cancellation.tier.percent')}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('payments.cancellation.tier.remove', { number: index + 1 })}
                    onClick={() => change(tiers.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                {problem && (
                  <p role="alert" className="text-error m-0 text-[12px]">
                    {t(`payments.cancellation.problems.${problem}`)}
                  </p>
                )}
              </div>
            )
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit gap-1.5"
            disabled={!addable}
            onClick={() => addable && change([...tiers, addable])}
          >
            <Plus className="size-3.5" aria-hidden />
            {t('payments.cancellation.addTier')}
          </Button>
        </div>
      )}

      {policy && valid && (
        <div className="flex flex-col gap-2">
          <p className="text-fg-3 m-0 text-[11px] font-semibold tracking-wide uppercase">
            {t('payments.cancellation.preview')}
          </p>
          <CancellationSchedule policy={policy} className="max-w-[460px]" />
        </div>
      )}

      <p className="text-fg-3 m-0 text-[12.5px]">{t('payments.cancellation.appliesFrom')}</p>
    </SettingsCard>
  )
}
