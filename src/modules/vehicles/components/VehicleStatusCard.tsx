import { useNavigate } from 'react-router-dom'
import { CalendarClock, CalendarPlus, CalendarRange, ChevronDown, Gauge, MapPin, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { VEHICLE_STATUSES, type Vehicle, type VehicleStatus } from '../types/vehicle.types'

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
}

export function VehicleStatusCard({ vehicle, currentRental, onStatusChange }: VehicleStatusCardProps) {
  const navigate = useNavigate()

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
            {VEHICLE_STATUSES.map((status) => (
              <DropdownMenuItem key={status} onSelect={() => status !== vehicle.status && onStatusChange(status)}>
                {status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-3.5">
        {currentRental && (
          <>
            <DetailRow icon={User} label="Current renter" value={`${currentRental.customer} · ${currentRental.reference}`} />
            <DetailRow icon={CalendarClock} label="Rental window" value={currentRental.window} />
          </>
        )}
        <DetailRow icon={MapPin} label="Home branch" value={vehicle.location} />
        <DetailRow icon={Gauge} label="Odometer" value={`${vehicle.mileage.toLocaleString('en-US')} mi`} />
        <DetailRow
          icon={CalendarRange}
          label="In fleet since"
          value={new Date(vehicle.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        />
      </div>

      <Button
        className="w-full gap-2"
        onClick={() => navigate('/app/bookings/new', { state: { vehicleId: vehicle.id } })}
      >
        <CalendarPlus className="size-4" />
        New booking
      </Button>
    </Card>
  )
}
