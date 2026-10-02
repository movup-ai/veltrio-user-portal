import { useState, type ReactNode } from 'react'
import { Check, Copy, Link2, Mail, MessageSquare, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { focusDialogContent } from '@/components/ui/dialog-focus'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { emailHref, smsHref } from '../utils/booking-payment.utils'

const COPIED_FOR_MS = 2_000

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
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_FOR_MS)
    } catch {
      // Refused outside a secure context or without permission; the field can still be copied.
      toast({ title: t('booking.link.copyFailed'), variant: 'error' })
    }
  }

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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="share-link">{t('booking.link.label')}</Label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Link2 className="text-fg-4 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="share-link"
                readOnly
                value={url}
                onFocus={(event) => event.currentTarget.select()}
                className="text-fg-2 pl-9"
              />
            </div>
            <Button type="button" variant="outline" onClick={copy} className="w-[92px] shrink-0">
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? t('booking.link.copied') : t('booking.link.copy')}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-fg-3 text-[12.5px] font-semibold">
            {t('booking.link.shareWith', { name: recipient.name })}
          </span>
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
