import { FileDown, FileText, PenLine, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { useFormatters } from '@/i18n'
import type { BookingAgreement } from '../types/booking.types'

export type AgreementAction = 'view' | 'download' | 'send'

interface BookingAgreementCardProps {
  agreement: BookingAgreement
  /** Names the file the renter receives — the booking reference. */
  reference: string
  onAction: (action: AgreementAction) => void
}

/**
 * The rental contract. Kept apart from the checklist because it isn't a check staff perform —
 * it's a document that goes out, comes back signed, and has to stay retrievable for years
 * afterwards.
 */
export function BookingAgreementCard({ agreement, reference, onAction }: BookingAgreementCardProps) {
  const { t } = useTranslation('bookings')
  const format = useFormatters()

  const note = agreement.signed
    ? t('details.agreement.signedNote', {
        when: agreement.signedAt ? format.date(agreement.signedAt, { month: 'short', day: 'numeric' }) : '—',
        method: t(`details.agreement.method.${agreement.method ?? 'eSignature'}`),
      })
    : t('details.agreement.unsignedNote')

  return (
    <Card as="section" className="flex flex-col p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-panel-title m-0">{t('details.agreement.title')}</h2>
        <StatusBadge status={agreement.signed ? 'Completed' : 'Pending'} />
      </div>

      {/* Stacked rather than inline: the card sits in the narrow column, where a row of file
          details plus two buttons wraps into something worse than a deliberate stack. */}
      <div className="border-border bg-surface-2 mt-3.5 flex flex-col gap-2.5 rounded-[10px] border p-3">
        <div className="flex items-center gap-2.5">
          <span className="border-border bg-surface text-fg-3 flex size-9 shrink-0 items-center justify-center rounded-[8px] border">
            <FileText className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-[13px] font-semibold">{`${reference}-agreement.pdf`}</p>
            <p className="text-fg-4 m-0 mt-0.5 text-[11.5px]">
              {note} · {t('details.agreement.terms', { version: agreement.version })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAction('view')}
            className="gap-1.5"
          >
            <FileText className="size-3.5" aria-hidden />
            {t('details.agreement.view')}
          </Button>
          {agreement.signed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAction('download')}
              className="gap-1.5"
            >
              <FileDown className="size-3.5" aria-hidden />
              {t('details.agreement.download')}
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => onAction('send')} className="gap-1.5">
              <Send className="size-3.5" aria-hidden />
              {t('details.agreement.send')}
            </Button>
          )}
        </div>
      </div>

      {!agreement.signed && (
        <p className="text-fg-4 m-0 mt-2.5 flex items-center gap-1.5 text-[12px]">
          <PenLine className="size-3.5 shrink-0" aria-hidden />
          {t('details.agreement.blockingHandover')}
        </p>
      )}
    </Card>
  )
}
