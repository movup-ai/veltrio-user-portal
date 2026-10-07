import { MessageSquareText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BookingRequest } from '../types/booking.types'
import { BookingBanner, type BannerDetail } from './BookingBanner'

interface BookingRequestBannerProps {
  /** Absent when the renter left no preference and no note: the banner still carries the buttons. */
  request?: BookingRequest
  /** Confirm and Decline. Passed in so this stays presentational, as the renter card's checklist is. */
  actions: React.ReactNode
}

/** A reservation waiting for an answer: what the renter asked for, beside the buttons that answer it. */
export function BookingRequestBanner({ request, actions }: BookingRequestBannerProps) {
  const { t } = useTranslation('bookings')
  const details: BannerDetail[] = []
  if (request?.paymentPreference) {
    details.push({
      label: t('details.request.paymentPreference'),
      value: t(`details.request.preference.${request.paymentPreference}`),
    })
  }
  if (request?.notes) details.push({ label: t('details.request.notes'), value: request.notes, wide: true })

  return (
    <BookingBanner
      tone="warning"
      icon={MessageSquareText}
      title={t('details.request.title')}
      subtitle={t('details.request.subtitle')}
      details={details}
      actions={actions}
    />
  )
}
