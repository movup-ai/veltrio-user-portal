import type { LucideIcon } from 'lucide-react'
import { useDomainLabels } from '@/i18n/domain'
import { statusColors } from './status-colors'

/**
 * `status` is always the canonical English value (it's what colors and filters key off).
 * Display text comes from the shared `domain:status` vocabulary, so every table in the app
 * localizes its badges without each module having to know about translations. `label` is for
 * a module whose own words are more exact, such as a check's "Needs review".
 */
export function StatusBadge({
  status,
  label,
  icon: Icon,
}: {
  status: string
  label?: string
  icon?: LucideIcon
}) {
  const domain = useDomainLabels()
  const { bg, fg } = statusColors(status)

  return (
    <span
      className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full py-[3px] pr-[9px] pl-[7px] text-[11.5px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      {/* An icon in place of the dot, for a state that should not read like its colour twin. */}
      {Icon ? (
        <Icon className="size-3" aria-hidden />
      ) : (
        <span className="size-[6px] rounded-full" style={{ background: fg }} />
      )}
      {label ?? domain.status(status)}
    </span>
  )
}
