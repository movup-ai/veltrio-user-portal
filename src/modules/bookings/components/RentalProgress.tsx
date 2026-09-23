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
 * booking is finished or hasn't started.
 */
export function RentalProgress({ stages }: RentalProgressProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()

  const reached = stages.filter((s) => s.state === 'done').length

  function noteFor(step: BookingStageStep): string {
    if (step.state === 'done' && step.at) {
      const when = format.date(step.at, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      return step.channel ? `${when} · ${t(`details.channels.${step.channel}`)}` : when
    }

    // Only handover and return are promises with a time on them. Confirming and closing happen
    // when the work is done, so dating them would invent a commitment nobody made.
    if (step.at && step.key === 'pickedUp') {
      const when = format.date(step.at, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      return t('details.progress.scheduled', { when })
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
        {/* Counts stages actually behind us — "Stage 2 of 5" means two are done, not two to go. */}
        <span className="text-fg-4 text-[12.5px] tabular-nums">
          {t('details.progress.stageOf', { current: reached, total: stages.length })}
        </span>
      </div>

      <ol className="grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
        {stages.map((step) => {
          const Icon = STAGE_ICONS[step.key]
          const done = step.state === 'done'
          const current = step.state === 'current'

          return (
            <li key={step.key} className="flex min-w-0 flex-col gap-2">
              {/* Only completed stages fill. The current one is dashed — reached, but not banked. */}
              <span
                aria-hidden
                className={cn(
                  'h-[3px] rounded-full',
                  done ? 'bg-primary' : current ? 'bg-tint border-primary border-y' : 'bg-surface-3',
                )}
              />
              <span className="flex items-center gap-1.5">
                <Icon
                  className={cn(
                    'size-3.5 shrink-0',
                    done ? 'text-primary' : current ? 'text-fg-2' : 'text-fg-4',
                  )}
                  aria-hidden
                />
                <span className={cn('truncate text-[13px] font-semibold', !done && !current && 'text-fg-4')}>
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
