import { useState } from 'react'
import { LifeBuoy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useFormatters } from '@/i18n'
import { cn } from '@/lib/utils'
import { initials } from '@/utils/formatting'
import { supportApi } from '../api/support.api'
import { MAX_MESSAGE_LENGTH } from '../constants/support.constants'
import { useAttachmentUploads } from '../hooks/use-attachment-uploads'
import { useCloseTicket, useReplyToTicket } from '../hooks/use-support'
import type { Ticket, TicketMessage } from '../types/support.types'
import { AttachmentPicker } from './AttachmentPicker'
import { MessageAttachments } from './MessageAttachments'

export function TicketThread({ ticket }: { ticket: Ticket }) {
  const { t } = useTranslation('support')

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card as="section" aria-label={t('ticket.conversation')} className="overflow-hidden">
        <ol className="divide-border-soft m-0 list-none divide-y p-0">
          {ticket.messages.map((message) => (
            <MessageItem key={message.id} ticketId={ticket.id} message={message} />
          ))}
        </ol>
      </Card>
      <ReplyBox ticket={ticket} />
    </div>
  )
}

function MessageItem({ ticketId, message }: { ticketId: string; message: TicketMessage }) {
  const { t } = useTranslation('support')
  const format = useFormatters()
  const fromVeltrio = message.side === 'platform'
  const name = fromVeltrio ? t('ticket.veltrio') : (message.authorName ?? t('ticket.formerMember'))

  return (
    <li className={cn('flex gap-3 px-5 py-4', fromVeltrio && 'bg-tint/40')}>
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
          fromVeltrio ? 'bg-primary-solid text-solid-foreground' : 'bg-surface-3 text-fg-2',
        )}
        aria-hidden
      >
        {fromVeltrio ? <LifeBuoy className="size-4" /> : initials(name)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[14px] font-semibold">{name}</span>
          {fromVeltrio && (
            <span className="bg-primary/10 text-primary rounded-full px-1.5 py-px text-[10.5px] font-semibold tracking-wide uppercase">
              {t('ticket.staffBadge')}
            </span>
          )}
          <time className="text-fg-4 text-[12.5px]" dateTime={message.createdAt}>
            {format.dateTime(message.createdAt)}
          </time>
        </div>
        {/* Kept as typed: line breaks carry steps and lists in a support message. */}
        <p className="text-body m-0 break-words whitespace-pre-wrap">{message.body}</p>
        <MessageAttachments
          attachments={message.attachments}
          getUrl={(attachmentId) => supportApi.attachmentUrl(ticketId, attachmentId, true)}
        />
      </div>
    </li>
  )
}

function ReplyBox({ ticket }: { ticket: Ticket }) {
  const { t } = useTranslation('support')
  const reply = useReplyToTicket(ticket.id)
  const close = useCloseTicket(ticket.id)
  const uploads = useAttachmentUploads()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string>()
  const closed = ticket.status === 'closed'

  const send = (event: React.FormEvent) => {
    event.preventDefault()
    const text = body.trim()
    if (!text) {
      setError(t('form.bodyRequired'))
      return
    }
    if (uploads.pending) {
      setError(t('attachments.pending'))
      return
    }
    setError(undefined)
    reply.mutate(
      { body: text, attachmentIds: uploads.ids },
      {
        onSuccess: () => {
          setBody('')
          uploads.reset()
        },
        onError: (failure) => setError(failure.message),
      },
    )
  }

  return (
    <Card as="section" className="p-5">
      <form noValidate onSubmit={send} className="flex flex-col gap-3">
        <label htmlFor="ticket-reply" className="text-label">
          {t('ticket.replyLabel')}
        </label>
        <Textarea
          id="ticket-reply"
          rows={4}
          maxLength={MAX_MESSAGE_LENGTH}
          value={body}
          invalid={Boolean(error)}
          aria-describedby={error ? 'ticket-reply-error' : closed ? 'ticket-reply-hint' : undefined}
          onChange={(event) => setBody(event.target.value)}
        />
        <AttachmentPicker uploads={uploads} disabled={reply.isPending} />
        {/* One row: the note beside the buttons, so it does not push them down a line of its own. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {error ? (
            <p id="ticket-reply-error" role="alert" className="text-error m-0 text-[13px]">
              {error}
            </p>
          ) : (
            closed && (
              <p id="ticket-reply-hint" className="text-description m-0">
                {t('ticket.closedHint')}
              </p>
            )
          )}
          <div className="ml-auto flex flex-wrap justify-end gap-2">
            {!closed && (
              <Button
                type="button"
                variant="outline"
                loading={close.isPending}
                disabled={reply.isPending}
                onClick={() => close.mutate()}
              >
                {t('ticket.close')}
              </Button>
            )}
            <Button type="submit" loading={reply.isPending} disabled={close.isPending}>
              {t('ticket.send')}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  )
}
