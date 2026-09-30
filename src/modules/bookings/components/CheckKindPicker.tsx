import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { STANDALONE_CHECKS, type StandaloneCheck } from '../constants/verification.constants'

interface CheckKindPickerProps {
  value: StandaloneCheck
  onChange: (kind: StandaloneCheck) => void
}

/**
 * Which check to run, chosen before the form so it only asks for what that check needs. Cards
 * rather than a dropdown: each says how the check works, which is what the choice turns on.
 */
export function CheckKindPicker({ value, onChange }: CheckKindPickerProps) {
  const { t } = useTranslation('bookings')

  return (
    <div
      role="radiogroup"
      aria-label={t('verificationPage.form.kindLabel')}
      className={cn(
        'grid grid-cols-1 gap-2.5',
        STANDALONE_CHECKS.length > 2 ? 'md:grid-cols-3' : 'sm:grid-cols-2',
      )}
    >
      {STANDALONE_CHECKS.map(({ kind, icon: Icon }) => {
        const selected = kind === value
        return (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(kind)}
            className={cn(
              'flex items-start gap-3 rounded-[10px] border p-3 text-left transition-colors',
              selected
                ? 'border-primary bg-tint ring-primary ring-1'
                : 'border-border hover:bg-surface-2',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-[9px] transition-colors',
                selected ? 'bg-primary text-primary-foreground' : 'bg-surface-3 text-fg-3',
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-semibold">
                  {t(`verificationPage.form.kinds.${kind}.title`)}
                </span>
                <span className="text-fg-4 shrink-0 text-[11.5px]">
                  {t(`verificationPage.form.kinds.${kind}.meta`)}
                </span>
              </span>
              <span className="text-fg-4 mt-0.5 block text-[12.5px] leading-snug">
                {t(`verificationPage.form.kinds.${kind}.description`)}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
