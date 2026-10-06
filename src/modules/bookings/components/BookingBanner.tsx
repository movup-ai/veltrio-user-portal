import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const TONES = {
  // Tinted like the Pending badge, so the banner and the badge read as one state.
  warning: { frame: 'bg-warning-tint border-warning/25', icon: 'text-warning' },
  // Tinted like the Declined badge: a request that was turned down, not one that lapsed.
  danger: { frame: 'bg-error-tint border-error/25', icon: 'text-error' },
}

export interface BannerDetail {
  label: string
  value: string
  /** Free text someone typed: takes the remaining width and keeps its line breaks. */
  wide?: boolean
}

interface BookingBannerProps {
  tone: keyof typeof TONES
  icon: LucideIcon
  title: string
  subtitle: string
  details: BannerDetail[]
  actions?: React.ReactNode
}

/** A strip across the top of the booking page for the one thing to know before reading on. */
export function BookingBanner({ tone, icon: Icon, title, subtitle, details, actions }: BookingBannerProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-x-8 gap-y-3 rounded-xl border px-[18px] py-3.5 lg:flex-row lg:items-center',
        TONES[tone].frame,
      )}
    >
      <div className="flex shrink-0 items-center gap-2.5">
        <span
          className={cn(
            'bg-surface flex size-8 shrink-0 items-center justify-center rounded-[9px]',
            TONES[tone].icon,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-panel-title m-0">{title}</h2>
          <p className="text-fg-3 m-0 text-[12px]">{subtitle}</p>
        </div>
      </div>

      <dl className="m-0 flex min-w-0 flex-1 flex-col gap-x-8 gap-y-2 text-[13px] sm:flex-row">
        {details.map((detail) => (
          <div key={detail.label} className={detail.wide ? 'min-w-0 flex-1' : 'shrink-0'}>
            <dt className="text-fg-3 text-[12px]">{detail.label}</dt>
            <dd className={detail.wide ? 'm-0 break-words whitespace-pre-line' : 'm-0 font-semibold'}>
              {detail.value}
            </dd>
          </div>
        ))}
      </dl>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </section>
  )
}
