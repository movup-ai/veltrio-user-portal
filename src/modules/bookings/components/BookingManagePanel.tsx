import { CalendarRange, CircleX, Repeat2, SquarePen, UserPlus } from 'lucide-react'
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
 * The four changes staff actually make to a live booking. A stacked list of full-width buttons
 * read as a menu of equals and put cancelling in the same rhythm as the routine edits — these
 * are tiles, with the destructive action set apart below the rule.
 */
export function BookingManagePanel({ onAction }: BookingManagePanelProps) {
  const { t } = useTranslation('bookings')

  return (
    <Card as="section" className="flex flex-col p-[18px]">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
        <PanelHeading title={t('details.manage.title')} description={t('details.manage.subtitle')} />
        {/* Out of the grid entirely — cancelling isn't one of four equivalent edits. */}
        <Button type="button" variant="destructive" size="sm" onClick={() => onAction('cancel')} className="shrink-0 gap-1.5">
          <CircleX className="size-3.5" aria-hidden />
          {t('details.manage.cancel')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {TILES.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onAction(key)}
            className="group border-border bg-surface hover:border-primary hover:bg-tint/40 flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left transition-colors"
          >
            <span className="bg-surface-3 text-fg-2 group-hover:bg-primary group-hover:text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px] transition-colors">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 text-[12.5px] leading-snug font-semibold" style={{ textWrap: 'balance' }}>
              {t(`details.manage.${key}`)}
            </span>
          </button>
        ))}
      </div>
    </Card>
  )
}
