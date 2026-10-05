import { useState, type ReactNode } from 'react'
import { CarFront, CircleAlert, CircleCheck, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/i18n'
import { cn } from '@/lib/utils'
import { useDomainLabels } from '@/i18n/domain'
import type { PublicPayment } from '../types/booking-payment.types'

/** What both the payment and the receipt page know about the rental. */
export type TripDetails = Pick<
  PublicPayment,
  'vehicleName' | 'vehiclePhotoUrl' | 'vehicleSpecs' | 'pickupAt' | 'returnAt' | 'pickupLocation'
>

/** The card a renter's public page sits in: payment, deposit, receipt or agreement. */
export function PublicPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border-border bg-card flex w-full max-w-[480px] flex-col gap-5 rounded-[14px] border p-6 shadow-sm sm:p-7',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** The company leads: the renter is dealing with them, and may never have heard of Veltrio. */
export function CompanyBadge({ companyName, reference }: { companyName: string; reference: string }) {
  const { t } = useTranslation('payments')
  const initials = companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="bg-tint text-primary flex size-10 shrink-0 items-center justify-center rounded-[10px] text-[14px] font-bold"
      >
        {initials}
      </span>
      <div className="min-w-0">
        <p className="m-0 truncate text-[14px] font-semibold">{companyName}</p>
        <p className="text-fg-4 m-0 text-[12px]">{t('pay.booking', { reference })}</p>
      </div>
    </div>
  )
}

const NOTICE_TONE = {
  check: { Icon: CircleCheck, tone: 'bg-success-tint text-success' },
  clock: { Icon: Clock, tone: 'bg-info-tint text-info' },
  alert: { Icon: CircleAlert, tone: 'bg-warning-tint text-warning' },
} as const

export function PublicNotice({
  icon,
  title,
  body,
}: {
  icon: keyof typeof NOTICE_TONE
  title: string
  body: string
}) {
  const { Icon, tone } = NOTICE_TONE[icon]

  return (
    <div className="flex flex-col items-center gap-2.5 py-2 text-center" role="status">
      <span className={`flex size-12 items-center justify-center rounded-full ${tone}`}>
        <Icon className="size-6" aria-hidden />
      </span>
      <h2 className="text-section-title m-0">{title}</h2>
      <p className="text-description m-0" style={{ textWrap: 'pretty' }}>
        {body}
      </p>
    </div>
  )
}

/** The car and when it changes hands, in one box: what the renter is paying for, or paid for. */
export function TripCard({ trip }: { trip: TripDetails }) {
  const { t } = useTranslation('payments')
  const format = useFormatters()
  const domain = useDomainLabels()
  const specs = trip.vehicleSpecs
  const details = specs
    ? [
        String(specs.year),
        domain.label('vehicleType', specs.type),
        domain.label('transmission', specs.transmission),
        t('pay.seats', { count: specs.seats }),
        domain.label('fuelType', specs.fuelType),
      ].join(' · ')
    : undefined
  const when = (date: string) =>
    format.date(date, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

  return (
    <div className="border-border-soft bg-surface-2 divide-border-soft flex flex-col divide-y rounded-[10px] border">
      <div className="flex items-center gap-3 p-3.5">
        <VehiclePhoto src={trip.vehiclePhotoUrl} alt={trip.vehicleName} />
        <div className="min-w-0">
          <p className="m-0 text-[14.5px] font-semibold">{trip.vehicleName}</p>
          {details && <p className="text-fg-3 m-0 mt-0.5 text-[12.5px]">{details}</p>}
        </div>
      </div>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 p-3.5 text-[13px]">
        <dt className="text-fg-3">{t('pay.pickup')}</dt>
        <dd className="m-0">
          {when(trip.pickupAt)}
          <span className="text-fg-3"> · {trip.pickupLocation}</span>
        </dd>
        <dt className="text-fg-3">{t('pay.return')}</dt>
        <dd className="m-0">{when(trip.returnAt)}</dd>
      </dl>
    </div>
  )
}

/** A small square thumbnail; the car icon stands in when there is none or it fails to load. */
function VehiclePhoto({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="border-border-soft bg-surface flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[9px] border">
      {src && !failed ? (
        <img src={src} alt={alt} onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <CarFront className="text-fg-4 size-6" aria-hidden />
      )}
    </span>
  )
}
