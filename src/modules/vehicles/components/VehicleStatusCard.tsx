import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarClock, CalendarPlus, CalendarRange, ChevronDown, Gauge, MapPin, User, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { useDomainLabels } from '@/i18n/domain'
import { useFormatters } from '@/i18n'
import { SELECTABLE_VEHICLE_STATUSES, type Vehicle, type VehicleStatus } from '../types/vehicle.types'

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="text-fg-4 mt-[3px] size-[15px] shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-meta text-fg-3">{label}</p>
        <p className="text-[13.5px] font-semibold">{value}</p>
      </div>
    </div>
  )
}

interface VehicleStatusCardProps {
  vehicle: Vehicle
  /** [customer, reference, rentalWindow] of the active booking, when the vehicle is out. */
  currentRental?: { customer: string; reference: string; window: string }
  onStatusChange: (status: VehicleStatus) => void
  onSendToService: () => void
  onReturnFromService: () => void
  serviceActionPending?: boolean
}

export function VehicleStatusCard({
  vehicle,
  currentRental,
  onStatusChange,
  onSendToService,
  onReturnFromService,
  serviceActionPending,
}: VehicleStatusCardProps) {
  const { t } = useTranslation('vehicles')
  const domain = useDomainLabels()
  const format = useFormatters()
  const navigate = useNavigate()
  const inService = vehicle.status === 'Maintenance'

  return (
    <Card className="flex flex-col gap-4 border-0 p-[18px] shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="inline-flex cursor-pointer items-center gap-1 rounded-full">
              <StatusBadge status={vehicle.status} />
              <ChevronDown className="text-fg-4 size-3.5" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SELECTABLE_VEHICLE_STATUSES.map((status) => (
              <DropdownMenuItem key={status} onSelect={() => status !== vehicle.status && onStatusChange(status)}>
                {domain.status(status)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-3.5">
        {currentRental && (
          <>
            <DetailRow
              icon={User}
              label={t('statusCard.currentRenter')}
              value={`${currentRental.customer} · ${currentRental.reference}`}
            />
            <DetailRow icon={CalendarClock} label={t('statusCard.rentalWindow')} value={currentRental.window} />
          </>
        )}
        <DetailRow icon={MapPin} label={t('statusCard.homeBranch')} value={vehicle.location} />
        <DetailRow icon={Gauge} label={t('statusCard.odometer')} value={`${format.number(vehicle.mileage)} mi`} />
        <DetailRow icon={CalendarRange} label={t('statusCard.inFleetSince')} value={format.monthYear(vehicle.createdAt)} />
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1 gap-2"
          onClick={() => navigate('/app/bookings/new', { state: { vehicleId: vehicle.id } })}
        >
          <CalendarPlus className="size-4" />
          {t('statusCard.newBooking')}
        </Button>
        {/* Archived vehicles are out of the fleet entirely, so neither action applies. */}
        {vehicle.status !== 'Archived' && (
          <Button
            variant="outline"
            className="flex-1 gap-2"
            loading={serviceActionPending}
            onClick={inService ? onReturnFromService : onSendToService}
          >
            <Wrench className="size-4" />
            {inService ? t('service.returnFromService') : t('service.sendToService')}
          </Button>
        )}
      </div>
    </Card>
  )
}
