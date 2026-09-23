import { useTranslation } from 'react-i18next'
import { BadgeCheck, FileCheck2, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { BOOKING_VERIFICATIONS, type BookingVerification } from '../types/booking.types'

const ICONS: Record<BookingVerification, LucideIcon> = {
  identity: BadgeCheck,
  background: ShieldCheck,
  insurance: FileCheck2,
}

interface BookingVerificationPickerProps {
  selected: BookingVerification[]
  onChange: (next: BookingVerification[]) => void
}

/**
 * Checks the branch requires before the keys change hands. Toggling one marks it as required
 * on the booking — running the check itself happens after the reservation exists.
 */
export function BookingVerificationPicker({ selected, onChange }: BookingVerificationPickerProps) {
  const { t } = useTranslation('bookings')

  function toggle(key: BookingVerification) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])
  }

  return (
    <div className="flex flex-col gap-2.5">
      {BOOKING_VERIFICATIONS.map((key) => {
        const Icon = ICONS[key]
        const checked = selected.includes(key)

        return (
          <label
            key={key}
            className={cn(
              'bg-surface flex cursor-pointer items-center gap-3 rounded-[11px] border p-3 transition-colors',
              checked ? 'border-primary bg-tint' : 'border-border hover:border-fg-4 hover:bg-surface-2',
            )}
          >
            <Icon className={cn('size-4 shrink-0', checked ? 'text-primary' : 'text-fg-4')} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">{t(`verification.${key}.label`)}</span>
              <span className="text-fg-4 block text-[12.5px]">{t(`verification.${key}.description`)}</span>
            </span>
            <Switch
              checked={checked}
              onCheckedChange={() => toggle(key)}
              aria-label={t(`verification.${key}.label`)}
            />
          </label>
        )
      })}
    </div>
  )
}
