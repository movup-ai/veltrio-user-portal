import { CalendarRange, ChevronRight, CircleX, Repeat2, SquarePen, UserPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { cn } from '@/lib/utils'

export type ManageAction = 'modify' | 'extend' | 'addDriver' | 'swapVehicle' | 'cancel'

const TILES: { key: Exclude<ManageAction, 'cancel'>; icon: LucideIcon }[] = [
  { key: 'modify', icon: SquarePen },
  { key: 'extend', icon: CalendarRange },
  { key: 'addDriver', icon: UserPlus },
  { key: 'swapVehicle', icon: Repeat2 },
]

interface BookingManagePanelProps {
  /** Rows that cannot be used now, each with why where there are words for it. */
  unavailable?: Partial<Record<ManageAction, { reason?: string }>>
  onAction: (action: ManageAction) => void
}

/**
 * The four changes staff actually make to a live booking, as one list of rows. Each carries a
 * hint, so the card reads as actions with consequences rather than a toolbar of icons.
 *
 * Cancelling is not one of the four: it sits below the list, and is outlined rather than solid
 * so the rarest and most destructive action is not also the loudest.
 */
export function BookingManagePanel({ unavailable = {}, onAction }: BookingManagePanelProps) {
  const { t } = useTranslation('bookings')

  return (
    <Card as="section" className="flex flex-col p-[18px]">
      <PanelHeading title={t('details.manage.title')} description={t('details.manage.subtitle')} />

      <ul className="border-border divide-border mt-3.5 divide-y overflow-hidden rounded-[10px] border">
        {TILES.map(({ key, icon: Icon }) => {
          const off = unavailable[key]
          return (
            <li key={key}>
              <button
                type="button"
                disabled={Boolean(off)}
                onClick={() => onAction(key)}
                className={cn(
                  'group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                  off ? 'cursor-not-allowed opacity-60' : 'hover:bg-tint/40',
                )}
              >
                <span
                  className={cn(
                    'bg-surface-3 text-fg-2 flex size-8 shrink-0 items-center justify-center rounded-[9px] transition-colors',
                    !off && 'group-hover:bg-primary group-hover:text-primary-foreground',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>

                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13.5px] leading-snug font-semibold">
                    {t(`details.manage.${key}`)}
                  </span>
                  {/* Why it is off replaces what it does: the second is no use without the first. */}
                  <span className={cn('text-fg-4 text-[11.5px] leading-snug', !off?.reason && 'truncate')}>
                    {off?.reason ?? t(`details.manage.hints.${key}`)}
                  </span>
                </span>

                {/* Says these open something rather than acting on the spot. */}
                <ChevronRight
                  aria-hidden
                  className={cn(
                    'text-fg-4 size-4 shrink-0 transition-colors',
                    !off && 'group-hover:text-primary',
                  )}
                />
              </button>
            </li>
          )
        })}
      </ul>

      {/* Outline until hover: unmistakably destructive, but not the loudest thing on the card.
          The ConfirmDialog is what actually guards the click. */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction('cancel')}
        className="text-error border-error/40 hover:bg-error hover:border-error mt-3 w-full gap-1.5 hover:text-white"
      >
        <CircleX className="size-3.5" aria-hidden />
        {t('details.manage.cancel')}
      </Button>
    </Card>
  )
}
