import { useDomainLabels } from '@/i18n/domain'
import { statusColors } from './status-colors'

/**
 * `status` is always the canonical English value (it's what colors and filters key off).
 * Display text comes from the shared `domain:status` vocabulary, so every table in the app
 * localizes its badges without each module having to know about translations.
 */
export function StatusBadge({ status }: { status: string }) {
  const domain = useDomainLabels()
  const { bg, fg } = statusColors(status)

  return (
    <span
      className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full py-[3px] pr-[9px] pl-[7px] text-[11.5px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      <span className="size-[6px] rounded-full" style={{ background: fg }} />
      {domain.status(status)}
    </span>
  )
}
