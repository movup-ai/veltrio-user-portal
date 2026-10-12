import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CALENDAR_VIEWS, type CalendarView } from '../types/booking-calendar.types'

interface BookingCalendarToolbarProps {
  view: CalendarView
  /** The span on show, already worded: "September 2026", "Sep 13 – 19, 2026". */
  title: string
  onStep: (steps: -1 | 1) => void
  onToday: () => void
}

const CHROME =
  'bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground flex h-[34px] shrink-0 items-center justify-center rounded-[9px] border transition-colors'

function StepButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(CHROME, 'w-[34px]')}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}

/** Where the calendar is and how wide it looks. The view tabs belong to the page's `Tabs`. */
export function BookingCalendarToolbar({ view, title, onStep, onToday }: BookingCalendarToolbarProps) {
  const { t } = useTranslation('bookings')

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
      <div className="flex items-center gap-1.5">
        <StepButton
          icon={ChevronLeft}
          label={t(`calendar.nav.previous.${view}`)}
          onClick={() => onStep(-1)}
        />
        <StepButton icon={ChevronRight} label={t(`calendar.nav.next.${view}`)} onClick={() => onStep(1)} />
        <button type="button" onClick={onToday} className={cn(CHROME, 'text-meta px-3')}>
          {t('calendar.nav.today')}
        </button>
      </div>

      {/* Spanish month names are lower case, which reads as a typo at the head of a page. */}
      <h2
        aria-live="polite"
        className="text-section-title m-0 min-w-0 flex-[1_1_180px] truncate first-letter:uppercase"
      >
        {title}
      </h2>

      <TabsList aria-label={t('calendar.viewsLabel')}>
        {CALENDAR_VIEWS.map((value) => (
          <TabsTrigger key={value} value={value}>
            {t(`calendar.views.${value}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  )
}
