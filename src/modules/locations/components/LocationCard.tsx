import { Car, Clock, MapPin, MoreVertical, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFormatters } from '@/i18n'
import type { Location } from '../types/location.types'
import { formatRange } from '../utils/hours'

interface Props {
  location: Location
  onEdit: () => void
  onDelete: () => void
}

export function LocationCard({ location, onEdit, onDelete }: Props) {
  const { t } = useTranslation('locations')
  const format = useFormatters()

  return (
    <Card className="flex flex-col gap-3.5 p-[18px]">
      <div className="flex items-start gap-3">
        <span className="bg-tint text-primary flex size-9 shrink-0 items-center justify-center rounded-[10px]">
          <MapPin className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="m-0 truncate text-[15px] font-semibold">{location.name}</h3>
            {location.isDefault && (
              <span
                className="bg-tint text-primary inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
                title={t('card.defaultHint')}
              >
                <Star className="size-3" />
                {t('card.default')}
              </span>
            )}
          </div>
          {location.address ? (
            <p className="text-fg-4 m-0 mt-[3px] text-[12.5px]" style={{ textWrap: 'pretty' }}>
              {location.address}
            </p>
          ) : (
            <p className="text-fg-4 m-0 mt-[3px] text-[12.5px] italic">{t('card.noAddress')}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <StatusBadge status={location.status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" aria-label={t('card.actions')}>
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>{t('card.edit')}</DropdownMenuItem>
              <DropdownMenuItem className="text-error focus:text-error" onClick={onDelete}>
                {t('card.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="text-fg-2 border-border-soft flex flex-col gap-[7px] border-t pt-3 text-[12.5px]">
        <div className="flex items-center gap-2">
          <Clock className="text-fg-4 size-3.5 shrink-0" />
          <span>
            {`${t(`hours.${location.openingDays}`)} · ${formatRange(location.opensAt, location.closesAt, format.locale)}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Car className="text-fg-4 size-3.5 shrink-0" />
          <span>{t('card.vehiclesHere', { count: location.vehicleCount })}</span>
        </div>
      </div>
    </Card>
  )
}
