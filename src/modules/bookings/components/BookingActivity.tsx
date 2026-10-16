import { useState } from 'react'
import {
  Activity,
  ArrowDownLeft,
  Banknote,
  CalendarPlus,
  CalendarRange,
  ChevronDown,
  CircleCheck,
  CircleX,
  CreditCard,
  FileSignature,
  FileText,
  FileX,
  Flag,
  Hourglass,
  KeyRound,
  Link2,
  ReceiptText,
  Repeat2,
  RotateCcw,
  TriangleAlert,
  Undo2,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { useFormatters } from '@/i18n'
import { useBookingActivity } from '../hooks/use-bookings'
import {
  activityActor,
  activityFacts,
  activityKind,
  activityTitle,
  type ActivityKind,
} from '../utils/booking.activity'

const EVENT_ICONS: Record<ActivityKind, LucideIcon> = {
  created: CalendarPlus,
  confirmed: CircleCheck,
  declined: CircleX,
  restored: RotateCcw,
  cancelled: CircleX,
  renter_settled: UserCheck,
  dates_changed: CalendarRange,
  vehicle_swapped: Repeat2,
  drivers_changed: UserPlus,
  extended: CalendarRange,
  extension_requested: CalendarRange,
  extension_cancelled: CalendarRange,
  extension_accepted: CalendarRange,
  picked_up: KeyRound,
  returned: ArrowDownLeft,
  closed: Flag,
  payment_link_created: Link2,
  payment_link_shared: Link2,
  deposit_requested: Link2,
  deposit_link_shared: Link2,
  payment_recorded: Banknote,
  payment_received: Banknote,
  payment_processing: Hourglass,
  payment_failed: TriangleAlert,
  deposit_held: CreditCard,
  deposit_lapsed: TriangleAlert,
  deposit_captured: CreditCard,
  deposit_released: CreditCard,
  return_charges_set: ReceiptText,
  payment_refunded: Undo2,
  contract_template_changed: FileText,
  contract_issued: FileText,
  contract_signed: FileSignature,
  contract_voided: FileX,
  other: Activity,
}

/** Shown before the rest is asked for: a rental's whole history can run to dozens of lines. */
const SHOWN_AT_FIRST = 8

interface BookingActivityProps {
  reference: string
  /** Whether the car is read for charge rather than fuel, for what a handover says it read. */
  electric?: boolean
}

/**
 * What has happened to the booking, newest first, as the API's audit log has it: who did what,
 * when, and the figure or reason that goes with it. Nothing here is worked out by the page.
 */
export function BookingActivity({ reference, electric }: BookingActivityProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()
  const { data: events, isLoading, isError, refetch } = useBookingActivity(reference)
  const [expanded, setExpanded] = useState(false)

  const shown = expanded ? (events ?? []) : (events ?? []).slice(0, SHOWN_AT_FIRST)
  const earlier = (events?.length ?? 0) - SHOWN_AT_FIRST

  return (
    <Card as="section" className="flex flex-col p-[18px]">
      <PanelHeading title={t('details.activity.title')} className="mb-3.5" />

      {isLoading ? (
        <LoadingState hideLabel className="py-6" />
      ) : isError || !events ? (
        <ErrorState
          description={t('details.activity.loadError')}
          onRetry={() => void refetch()}
          className="py-4"
        />
      ) : events.length === 0 ? (
        <EmptyState icon={Activity} title={t('details.activity.empty')} className="py-6" />
      ) : (
        <>
          <ol className="m-0 flex list-none flex-col p-0">
            {shown.map((event, index) => {
              const Icon = EVENT_ICONS[activityKind(event.type)]
              const newest = index === 0
              // The rail runs on into the control below when there is one, so it ends the sequence.
              const last = index === shown.length - 1 && earlier <= 0
              const line = [
                format.dateTime(event.at),
                activityActor(event, t),
                ...activityFacts(event, t, format, { electric }),
              ].join(' · ')

              return (
                <li key={event.id} className="relative flex items-start gap-2.5">
                  {/* A rail joining the icons, so the entries read as one sequence rather than a
                      stack of unrelated lines. Stops at the last icon instead of trailing past it. */}
                  {!last && (
                    <span aria-hidden className="bg-border-soft absolute top-7 bottom-0 left-[13.5px] w-px" />
                  )}

                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full',
                      // The newest entry is the one the counter is looking for; the rest recede.
                      newest ? 'bg-primary-solid text-solid-foreground' : 'bg-surface-2 text-fg-4',
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </span>

                  <span className={cn('min-w-0', !last && 'pb-3.5')}>
                    <span className={cn('block text-[13px]', newest ? 'font-semibold' : 'font-medium')}>
                      {activityTitle(event, t)}
                    </span>
                    <span className="text-fg-4 block text-[11.5px]" style={{ overflowWrap: 'anywhere' }}>
                      {line}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>

          {earlier > 0 && (
            // The last stop on the rail rather than a button under it: dashed, as what is not shown.
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
              className="group focus-visible:outline-ring flex w-fit items-center gap-2.5 rounded-full pr-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="border-border-strong text-fg-3 group-hover:border-primary group-hover:text-primary flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed transition-colors">
                <ChevronDown
                  className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
                  aria-hidden
                />
              </span>
              <span className="text-fg-3 group-hover:text-foreground text-[12.5px] font-semibold transition-colors">
                {expanded
                  ? t('details.activity.showFewer')
                  : t('details.activity.showEarlier', { count: earlier })}
              </span>
            </button>
          )}
        </>
      )}
    </Card>
  )
}
