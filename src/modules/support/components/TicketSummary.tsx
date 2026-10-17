import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { useFormatters } from '@/i18n'
import { cn } from '@/lib/utils'
import { NOTICE_ICON, TONE_CLASS, type Tone } from '@/lib/tone'
import type { Ticket, TicketStatus } from '../types/support.types'

const NOTICE_TONE: Record<TicketStatus, Tone> = {
  open: 'info',
  waiting_on_customer: 'warning',
  closed: 'neutral',
}

/** Whose turn it is, said above the thread so nobody has to read the badge to know. */
export function TicketStatusNotice({ ticket }: { ticket: Ticket }) {
  const { t } = useTranslation('support')
  const format = useFormatters()
  const tone = NOTICE_TONE[ticket.status]
  const Icon = NOTICE_ICON[tone]

  return (
    <div
      role="status"
      className={cn('flex items-start gap-2.5 rounded-[11px] px-4 py-3 text-[13px]', TONE_CLASS[tone])}
    >
      <Icon className="mt-px size-4 shrink-0" aria-hidden />
      <p className="text-fg-2 m-0">
        {ticket.status === 'closed' && ticket.closedAt
          ? t('ticket.notice.closedOn', { date: format.dateTime(ticket.closedAt) })
          : t(`ticket.notice.${ticket.status}`)}
      </p>
    </div>
  )
}

export function TicketSummary({ ticket }: { ticket: Ticket }) {
  const { t } = useTranslation('support')
  const format = useFormatters()
  const [copied, setCopied] = useState(false)
  const reference = `#${ticket.number}`

  const copy = () => {
    void navigator.clipboard.writeText(reference).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const facts: [string, string][] = [
    [t('ticket.details.topic'), t(`categories.${ticket.category}`)],
    [t('ticket.details.openedBy'), ticket.authorName ?? t('ticket.formerMember')],
    [t('ticket.details.opened'), format.dateTime(ticket.createdAt)],
    [t('ticket.details.lastUpdated'), format.dateTime(ticket.lastMessageAt)],
    ...(ticket.closedAt
      ? [[t('ticket.details.closed'), format.dateTime(ticket.closedAt)] as [string, string]]
      : []),
  ]

  return (
    <Card as="section" aria-labelledby="ticket-summary" className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h2 id="ticket-summary" className="text-fg-3 m-0 text-[12px] font-semibold tracking-wide uppercase">
          {t('ticket.details.id')}
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[20px] font-semibold tracking-tight">{reference}</span>
          <button
            type="button"
            onClick={copy}
            aria-label={t('ticket.details.copyId')}
            className="text-fg-4 hover:bg-surface-3 hover:text-foreground flex size-7 items-center justify-center rounded-[7px] transition-colors"
          >
            {copied ? (
              <Check className="text-success size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
          </button>
          <span aria-live="polite" className="text-success text-[12px]">
            {copied ? t('ticket.details.copied') : ''}
          </span>
        </div>
        <p className="text-description m-0">{t('ticket.details.idHint')}</p>
      </div>
      <dl className="border-border-soft m-0 grid grid-cols-[96px_1fr] items-center gap-x-3 gap-y-2.5 border-t pt-4 text-[13px]">
        {facts.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-fg-3">{term}</dt>
            <dd className="m-0 min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
