import { CalendarRange, ChevronRight, CircleX, Repeat2, SquarePen, UserPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'

export type ManageAction = 'modify' | 'extend' | 'addDriver' | 'swapVehicle' | 'cancel'

const TILES: { key: Exclude<ManageAction, 'cancel'>; icon: LucideIcon }[] = [
  { key: 'modify', icon: SquarePen },
  { key: 'extend', icon: CalendarRange },
  { key: 'addDriver', icon: UserPlus },
  { key: 'swapVehicle', icon: Repeat2 },
]

interface BookingManagePanelProps {
  onAction: (action: ManageAction) => void
}

/**
 * The four changes staff actually make to a live booking, as one list of rows. Each carries a
 * hint, so the card reads as actions with consequences rather than a toolbar of icons.
 *
 * Cancelling is not one of the four: it sits below the list, and is outlined rather than solid
 * so the rarest and most destructive action is not also the loudest.
 */
export function BookingManagePanel({ onAction }: BookingManagePanelProps) {
  const { t } = useTranslation('bookings')

  return (
    <Card as="section" className="flex flex-col p-[18px]">
      <PanelHeading title={t('details.manage.title')} description={t('details.manage.subtitle')} />

      <ul className="border-border divide-border mt-3.5 divide-y overflow-hidden rounded-[10px] border">
        {TILES.map(({ key, icon: Icon }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => onAction(key)}
              className="group hover:bg-tint/40 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
            >
              <span className="bg-surface-3 text-fg-2 group-hover:bg-primary group-hover:text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px] transition-colors">
                <Icon className="size-4" aria-hidden />
              </span>

              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13.5px] leading-snug font-semibold">
                  {t(`details.manage.${key}`)}
                </span>
                <span className="text-fg-4 truncate text-[11.5px] leading-snug">
                  {t(`details.manage.hints.${key}`)}
                </span>
              </span>

              {/* Says these open something rather than acting on the spot. */}
              <ChevronRight
                aria-hidden
                className="text-fg-4 group-hover:text-primary size-4 shrink-0 transition-colors"
              />
            </button>
          </li>
        ))}
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
