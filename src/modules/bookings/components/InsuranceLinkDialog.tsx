import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy } from 'lucide-react'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { useSendInsuranceLink, type InsuranceLinkSession } from '../hooks/use-verification'

const COPIED_FOR_MS = 2_000

interface InsuranceLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Undefined while the session is still being opened. */
  session?: InsuranceLinkSession
  renterName: string
  defaultEmail?: string
  defaultPhone?: string
}

/**
 * The link a renter connects their insurer from, on any device, and the ways to get it to them.
 * The verdict lands on the check's tile by its own poll, so nothing here waits for it.
 */
export function InsuranceLinkDialog({
  open,
  onOpenChange,
  session,
  renterName,
  defaultEmail = '',
  defaultPhone = '',
}: InsuranceLinkDialogProps) {
  const { t } = useTranslation('bookings')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('insuranceLink.title')}</DialogTitle>
          <DialogDescription>{t('insuranceLink.description', { name: renterName })}</DialogDescription>
        </DialogHeader>

        {/* Mounted per link, so each opening starts from the renter's current details. */}
        {session ? (
          <LinkBody session={session} defaultEmail={defaultEmail} defaultPhone={defaultPhone} />
        ) : (
          <LoadingState label={t('insuranceLink.opening')} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function LinkBody({
  session,
  defaultEmail,
  defaultPhone,
}: {
  session: InsuranceLinkSession
  defaultEmail: string
  defaultPhone: string
}) {
  const { t } = useTranslation('bookings')
  const send = useSendInsuranceLink(session.verificationId)
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState(defaultEmail)
  const [phone, setPhone] = useState(defaultPhone)

  async function copy() {
    try {
      await navigator.clipboard.writeText(session.link)
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_FOR_MS)
    } catch {
      // Refused outside a secure context or without permission; the field can still be copied.
      toast({ title: t('insuranceLink.copyFailed'), variant: 'error' })
    }
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="insurance-link">{t('insuranceLink.linkLabel')}</Label>
        <div className="flex gap-2">
          <Input
            id="insurance-link"
            readOnly
            value={session.link}
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button type="button" variant="outline" onClick={copy} className="shrink-0">
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? t('insuranceLink.copied') : t('insuranceLink.copy')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email">{t('insuranceLink.email')}</TabsTrigger>
          <TabsTrigger value="sms">{t('insuranceLink.sms')}</TabsTrigger>
        </TabsList>
        <TabsContent value="email" className="mt-3">
          <SendRow
            id="insurance-link-email"
            type="email"
            label={t('insuranceLink.emailLabel')}
            value={email}
            onChange={setEmail}
            action={t('insuranceLink.sendEmail')}
            sending={send.isPending && send.variables?.channel === 'email'}
            onSend={() => send.mutate({ channel: 'email', to: email.trim() })}
          />
        </TabsContent>
        <TabsContent value="sms" className="mt-3">
          <SendRow
            id="insurance-link-sms"
            type="tel"
            label={t('insuranceLink.phoneLabel')}
            value={phone}
            onChange={setPhone}
            action={t('insuranceLink.sendSms')}
            sending={send.isPending && send.variables?.channel === 'sms'}
            onSend={() => send.mutate({ channel: 'sms', to: phone.trim() })}
          />
        </TabsContent>
      </Tabs>
    </>
  )
}

interface SendRowProps {
  id: string
  type: 'email' | 'tel'
  label: string
  value: string
  onChange: (value: string) => void
  action: string
  sending: boolean
  onSend: () => void
}

function SendRow({ id, type, label, value, onChange, action, sending, onSend }: SendRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
        <Button
          type="button"
          loading={sending}
          disabled={!value.trim()}
          onClick={onSend}
          className="shrink-0"
        >
          {action}
        </Button>
      </div>
    </div>
  )
}
