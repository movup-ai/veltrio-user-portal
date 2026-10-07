import { CalendarDays, CircleCheck, FileCheck, KeyRound, Undo2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { useFormatters } from '@/i18n'
import type { BookingStage, BookingStageStep } from '../types/booking.types'

const STAGE_ICONS: Record<BookingStage, LucideIcon> = {
  reserved: CalendarDays,
  confirmed: CircleCheck,
  pickedUp: KeyRound,
  returned: Undo2,
  closed: FileCheck,
}

interface RentalProgressProps {
  stages: BookingStageStep[]
}

/**
 * Where the rental has got to, as five bars. Stages behind us are dated with what happened;
 * the ones ahead are dated with what's expected — so the strip answers "what now?" whether the
 * booking is finished or hasn't started. One that was declined or cancelled says where it ended.
 */
export function RentalProgress({ stages }: RentalProgressProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()

  const done = stages.filter((s) => s.state === 'done')
  const ended = stages.some((s) => s.state === 'skipped')
  const lastReached = done.at(-1)

  function noteFor(step: BookingStageStep): string {
    if (step.state === 'skipped') return t('details.progress.notReached')
    if (step.state === 'done') {
      // Done, but nothing recorded when: said plainly rather than dated with a guess.
      if (!step.at) return t('details.progress.done')
      const when = format.dateTime(step.at)
      return step.channel ? `${when} · ${t(`details.channels.${step.channel}`)}` : when
    }

    // Only handover and return are promises with a time on them. Confirming and closing happen
    // when the work is done, so dating them would invent a commitment nobody made.
    if (step.at && step.key === 'pickedUp') {
      return t('details.progress.scheduled', { when: format.dateTime(step.at) })
    }
    if (step.at && step.key === 'returned') {
      return t('details.progress.due', { when: format.shortDate(step.at) })
    }
    return t(`details.progress.waiting.${step.key}`)
  }

  return (
    <Card as="section" className="p-[18px]">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="text-panel-title m-0">{t('details.progress.title')}</h2>
        <span className="text-fg-4 text-[12.5px] tabular-nums">
          {ended && lastReached
            ? t('details.progress.endedAt', { stage: t(`details.stages.${lastReached.key}`) })
            : // Counts stages actually behind us — "Stage 2 of 5" means two are done, not two to go.
              t('details.progress.stageOf', { current: done.length, total: stages.length })}
        </span>
      </div>

      <ol className="m-0 grid list-none gap-x-3 gap-y-4 p-0 sm:grid-cols-2 lg:grid-cols-5">
        {stages.map((step) => {
          const Icon = STAGE_ICONS[step.key]
          const isDone = step.state === 'done'
          const current = step.state === 'current'
          const skipped = step.state === 'skipped'

          return (
            <li
              key={step.key}
              aria-current={current ? 'step' : undefined}
              className="flex min-w-0 flex-col gap-2"
            >
              {/* Solid only once it has happened; the one up next is faded, never part-filled.
                  A step the booking never reached is a dashed outline, not one still to come. */}
              <span
                aria-hidden
                data-filled={isDone ? '' : undefined}
                className={cn(
                  'block h-1.5 rounded-full',
                  isDone && 'bg-primary',
                  current && 'bg-primary/35',
                  step.state === 'pending' && 'bg-surface-3',
                  skipped && 'border-border-strong border border-dashed',
                )}
              />
              <span className="flex items-center gap-1.5">
                <Icon
                  className={cn(
                    'size-3.5 shrink-0',
                    isDone ? 'text-primary' : current ? 'text-fg-2' : 'text-fg-4',
                  )}
                  aria-hidden
                />
                <span className={cn('truncate text-[13px] font-semibold', !isDone && !current && 'text-fg-4')}>
                  {t(`details.stages.${step.key}`)}
                </span>
              </span>
              <span className="text-fg-4 text-[11.5px]">{noteFor(step)}</span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
