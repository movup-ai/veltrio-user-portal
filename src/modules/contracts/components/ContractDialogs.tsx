import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ShareLinkDialog, type LinkRecipient } from '@/modules/payments/components/ShareLinkDialog'
import { VOID_REASON_MAX } from '../constants/booking-contract.constants'
import { useAgreementTemplates } from '../hooks/use-agreement-templates'
import {
  useChangeContractTemplate,
  usePublicContract,
  useSignAtCounter,
  useVoidContract,
} from '../hooks/use-booking-contract'
import type { BookingContract, ContractLink } from '../types/booking-contract.types'
import { contractLinkUrl } from '../utils/booking-contract.utils'
import { AgreementDocument } from './AgreementDocument'
import { SignAgreementForm } from './SignAgreementForm'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ContractLinkDialogProps extends DialogProps {
  contract: BookingContract & { link: ContractLink }
  renter: LinkRecipient
  companyName: string
  reference: string
}

/** The renter's link: to sign on while the agreement is open, and to their copy once it is signed. */
export function ContractLinkDialog({ contract, renter, companyName, reference, ...dialog }: ContractLinkDialogProps) {
  const { t } = useTranslation('contracts')
  const url = contractLinkUrl(window.location.origin, contract.link)
  const signed = contract.status === 'signed'
  const values = { name: renter.name, company: companyName, reference, url }

  return (
    <ShareLinkDialog
      {...dialog}
      title={t(signed ? 'link.copyTitle' : 'link.title')}
      description={t(signed ? 'link.copyDescription' : 'link.description', values)}
      summary={[{ label: t('link.summary'), value: contract.number ?? reference }]}
      url={url}
      recipient={renter}
      subject={t(signed ? 'link.copySubject' : 'link.subject', values)}
      message={t(signed ? 'link.copyMessage' : 'link.message', values)}
    />
  )
}

interface CounterSignDialogProps extends DialogProps {
  reference: string
  link: ContractLink
  renterName: string
}

/**
 * The agreement on the counter's own device, for a renter standing in front of it. It reads the
 * same page the renter's link serves, and signs through the staff endpoint, which records who
 * was logged in as the witness.
 */
export function CounterSignDialog({ reference, link, renterName, open, onOpenChange }: CounterSignDialogProps) {
  const { t } = useTranslation('contracts')
  const { data: agreement, isLoading, refetch } = usePublicContract(open ? link : undefined)
  const sign = useSignAtCounter(reference)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{t('counter.title')}</DialogTitle>
          <DialogDescription>{t('counter.description', { name: renterName })}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <LoadingState />
        ) : !agreement ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <>
            <AgreementDocument content={agreement} />
            <div className="border-border-soft border-t pt-5">
              <SignAgreementForm
                defaultName={renterName}
                submitting={sign.isPending}
                error={sign.error}
                onSubmit={(input) => sign.mutate(input, { onSuccess: () => onOpenChange(false) })}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface VoidContractDialogProps extends DialogProps {
  reference: string
  signed: boolean
}

export function VoidContractDialog({ reference, signed, open, onOpenChange }: VoidContractDialogProps) {
  const { t } = useTranslation('contracts')
  const { t: tCommon } = useTranslation('common')
  const voidContract = useVoidContract(reference)
  const [reason, setReason] = useState('')
  const [attempted, setAttempted] = useState(false)
  const missing = attempted && !reason.trim()

  // Closing clears it, voided or not: an abandoned attempt must not greet the next one.
  function close() {
    setReason('')
    setAttempted(false)
    onOpenChange(false)
  }

  function confirm() {
    setAttempted(true)
    if (!reason.trim()) return
    voidContract.mutate(reason, { onSuccess: close })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('void.title')}</DialogTitle>
          <DialogDescription>{t(signed ? 'void.signedDescription' : 'void.unsignedDescription')}</DialogDescription>
        </DialogHeader>
        <FormField label={t('void.reason')} error={missing ? t('void.reasonRequired') : undefined} required>
          {(fieldProps) => (
            <Textarea
              rows={3}
              maxLength={VOID_REASON_MAX}
              placeholder={t('void.reasonPlaceholder')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              {...fieldProps}
            />
          )}
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={voidContract.isPending}>
            {tCommon('actions.cancel')}
          </Button>
          <Button variant="destructive" onClick={confirm} loading={voidContract.isPending}>
            {t('void.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ChangeTemplateDialogProps extends DialogProps {
  reference: string
  /** The template the booking is on now, preselected. Absent once that template was deleted. */
  currentId?: string
}

export function ChangeTemplateDialog({ reference, currentId, open, onOpenChange }: ChangeTemplateDialogProps) {
  const { t } = useTranslation('contracts')
  const { t: tCommon } = useTranslation('common')
  const { data: templates, isLoading, refetch } = useAgreementTemplates()
  const change = useChangeContractTemplate(reference)
  const [picked, setPicked] = useState<string>()
  const templateId = picked ?? currentId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('template.title')}</DialogTitle>
          <DialogDescription>{t('template.description')}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <LoadingState />
        ) : !templates ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <FormField label={t('template.label')}>
            {(fieldProps) => (
              <Select value={templateId} onValueChange={setPicked}>
                <SelectTrigger {...fieldProps}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.isDefault ? t('template.default', { name: template.name }) : template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={change.isPending}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            disabled={!templateId || templateId === currentId}
            loading={change.isPending}
            onClick={() => templateId && change.mutate(templateId, { onSuccess: () => onOpenChange(false) })}
          >
            {t('template.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
