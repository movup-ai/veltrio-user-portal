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
 * The four changes staff actually make to a live booking, as tiles. Each carries a hint, so
 * the card reads as actions with consequences rather than a toolbar of icons.
 *
 * Cancelling is not one of the four: it sits outside the grid, and is outlined rather than
 * solid so the rarest and most destructive action is not also the loudest.
 */
export function BookingManagePanel({ onAction }: BookingManagePanelProps) {
  const { t } = useTranslation('bookings')

  return (
    <Card as="section" className="flex flex-col p-[18px]">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
        <PanelHeading title={t('details.manage.title')} description={t('details.manage.subtitle')} />
        {/* Out of the grid entirely — cancelling isn't one of four equivalent edits. */}
        {/* Outline until hover: unmistakably destructive, but no longer the loudest thing on
            the card. The ConfirmDialog is what actually guards the click. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAction('cancel')}
          className="text-error border-error/40 hover:bg-error hover:border-error shrink-0 gap-1.5 hover:text-white"
        >
          <CircleX className="size-3.5" aria-hidden />
          {t('details.manage.cancel')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onAction(key)}
            className="group border-border bg-surface hover:border-primary hover:bg-tint/40 flex items-start gap-2.5 rounded-[10px] border p-3 text-left transition-colors"
          >
            <span className="bg-surface-3 text-fg-2 group-hover:bg-primary group-hover:text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px] transition-colors">
              <Icon className="size-4" aria-hidden />
            </span>

            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-1">
                <span className="min-w-0 flex-1 text-[13.5px] leading-snug font-semibold">
                  {t(`details.manage.${key}`)}
                </span>
                {/* Says these open something rather than acting on the spot. */}
                <ChevronRight
                  aria-hidden
                  className="text-fg-4 group-hover:text-primary size-3.5 shrink-0 transition-colors"
                />
              </span>
              <span
                className="text-fg-4 mt-1 text-[11.5px] leading-snug"
                style={{ textWrap: 'pretty' }}
              >
                {t(`details.manage.hints.${key}`)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  )
}
