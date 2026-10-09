import { Ban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/i18n'
import type { BookingCancellation } from '../types/booking.types'
import { BookingBanner, type BannerDetail } from './BookingBanner'

/** Why a booking the company had accepted was cancelled, and what it told the renter. */
export function BookingCancelledBanner({ cancelled }: { cancelled: BookingCancellation }) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()
  const details: BannerDetail[] = [
    { label: t('details.cancelled.reason'), value: t(`details.cancelled.reasons.${cancelled.reason}`) },
  ]
  if (cancelled.message) {
    details.push({ label: t('details.cancelled.message'), value: cancelled.message, wide: true })
  }

  return (
    <BookingBanner
      tone="danger"
      icon={Ban}
      title={t('details.cancelled.title')}
      subtitle={t('details.cancelled.subtitle', { date: format.shortDate(cancelled.at) })}
      details={details}
    />
  )
}
