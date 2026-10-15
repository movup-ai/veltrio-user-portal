import type { ReactNode } from 'react'
import { Mail, MessageSquare, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CopyLinkField } from '@/components/forms/CopyLinkField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { focusDialogContent } from '@/components/ui/dialog-focus'
import { emailHref, smsHref } from '../utils/booking-payment.utils'

export interface LinkRecipient {
  name: string
  email: string
  phone: string
}

interface ShareLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  /** What the link is about, label and amount, in a box above it. */
  summary: { label: string; value: string }[]
  url: string
  recipient: LinkRecipient
  subject: string
  message: string
  /** Below the share buttons: a note, or another way to hand the same thing over. */
  footer?: ReactNode
}

/**
 * A link for the renter and the ways to get it to them. Email and Text open the counter's own
 * apps with the message written, so nothing needs a mail server, and the counter can open the
 * link on a tablet for a renter standing in front of them.
 */
export function ShareLinkDialog({
  open,
  onOpenChange,
  title,
  description,
  summary,
  url,
  recipient,
  subject,
  message,
  footer,
}: ShareLinkDialogProps) {
  const { t } = useTranslation('payments')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 outline-none sm:max-w-[520px]" onOpenAutoFocus={focusDialogContent}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <dl className="border-border-soft bg-surface-2 divide-border-soft m-0 flex flex-col divide-y rounded-[10px] border px-3.5">
          {summary.map((line) => (
            <SummaryLine key={line.label} {...line} />
          ))}
        </dl>

        <CopyLinkField
          id="share-link"
          label={t('booking.link.label')}
          url={url}
          copyLabel={t('booking.link.copy')}
          copiedLabel={t('booking.link.copied')}
          copyFailed={t('booking.link.copyFailed')}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-label">{t('booking.link.shareWith', { name: recipient.name })}</span>
          <div className="grid grid-cols-2 gap-2">
            <ShareButton
              icon={Mail}
              label={t('booking.link.email')}
              detail={recipient.email}
              href={emailHref(recipient.email, subject, message)}
            />
            <ShareButton
              icon={MessageSquare}
              label={t('booking.link.text')}
              detail={recipient.phone}
              href={smsHref(recipient.phone, message)}
            />
          </div>
        </div>

        {footer}
      </DialogContent>
    </Dialog>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-fg-2 text-[13px]">{label}</dt>
      <dd className="m-0 text-[15px] font-bold tabular-nums">{value}</dd>
    </div>
  )
}

/** Opens the counter's own app; the address under the label shows where it will go. */
function ShareButton({
  icon: Icon,
  label,
  detail,
  href,
}: {
  icon: LucideIcon
  label: string
  detail: string
  href: string
}) {
  return (
    <Button variant="outline" asChild className="h-auto justify-start gap-2.5 px-3 py-2">
      <a href={href}>
        <Icon className="text-fg-3 size-4 shrink-0" aria-hidden />
        <span className="flex min-w-0 flex-col items-start leading-tight">
          <span className="text-[13px] font-semibold">{label}</span>
          <span className="text-fg-4 w-full truncate text-[11.5px] font-normal">{detail}</span>
        </span>
      </a>
    </Button>
  )
}
