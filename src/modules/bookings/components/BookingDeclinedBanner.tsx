import { CircleX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/i18n'
import type { BookingDecline } from '../types/booking.types'
import { BookingBanner, type BannerDetail } from './BookingBanner'

interface BookingDeclinedBannerProps {
  declined: BookingDecline
  /** Restore, while the decline can still be undone. Passed in, as the request banner's are. */
  actions?: React.ReactNode
}

/** Why the company turned this reservation down, and what it told the renter. */
export function BookingDeclinedBanner({ declined, actions }: BookingDeclinedBannerProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()
  const details: BannerDetail[] = [
    { label: t('details.declined.reason'), value: t(`details.declined.reasons.${declined.reason}`) },
  ]
  if (declined.message) {
    details.push({ label: t('details.declined.message'), value: declined.message, wide: true })
  }

  return (
    <BookingBanner
      tone="danger"
      icon={CircleX}
      title={t('details.declined.title')}
      subtitle={t('details.declined.subtitle', { date: format.shortDate(declined.at) })}
      details={details}
      actions={actions}
    />
  )
}
