import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { usePermissions } from '@/components/feedback/Can'
import {
  ChangeTemplateDialog,
  ContractLinkDialog,
  CounterSignDialog,
  VoidContractDialog,
} from '@/modules/contracts/components/ContractDialogs'
import {
  useBookingContract,
  useContractPdfOpener,
  useDownloadContract,
  useIssueContract,
} from '@/modules/contracts/hooks/use-booking-contract'
import type { LinkRecipient } from '@/modules/payments/components/ShareLinkDialog'
import { useOrganizationStore } from '@/state/organization.store'
import { hasAnyPermission } from '@/utils/permissions'
import { BookingAgreementCard, type AgreementAction } from './BookingAgreementCard'

type AgreementDialog = 'link' | 'counter' | 'template' | 'void'

/** The agreement card with its data and every action behind it. */
export function BookingAgreementSection({ reference, renter }: { reference: string; renter: LinkRecipient }) {
  const { data: contract, isLoading, isError, refetch } = useBookingContract(reference)
  const companyName = useOrganizationStore((state) => state.membership?.organizationName ?? '')
  const subdomain = useOrganizationStore((state) => state.membership?.subdomain ?? '')
  const canVoid = hasAnyPermission(usePermissions(), ['contracts.void'])
  const issue = useIssueContract(reference)
  const view = useContractPdfOpener(reference)
  const download = useDownloadContract(reference)
  const [dialog, setDialog] = useState<AgreementDialog | null>(null)
  // Which button asked for the agreement to be issued, so that one shows the wait.
  const [issuingFor, setIssuingFor] = useState<AgreementAction>()
  const close = () => setDialog(null)

  if (isLoading) {
    return (
      <Card as="section" className="p-[18px]">
        <LoadingState />
      </Card>
    )
  }
  if (isError || !contract) {
    return (
      <Card as="section" className="p-[18px]">
        <ErrorState onRetry={() => void refetch()} />
      </Card>
    )
  }

  /** Both need the renter's link, which exists once the agreement is issued. */
  const issueThen = (action: AgreementAction, next: AgreementDialog) => {
    if (contract.link) return setDialog(next)
    setIssuingFor(action)
    issue.mutate(undefined, { onSuccess: () => setDialog(next), onSettled: () => setIssuingFor(undefined) })
  }

  const run = (action: AgreementAction) => {
    if (action === 'view') return view.open()
    if (action === 'download') return download.mutate()
    if (action === 'send') return issueThen(action, 'link')
    if (action === 'signAtCounter') return issueThen(action, 'counter')
    if (action === 'shareCopy') return setDialog('link')
    setDialog(action === 'void' ? 'void' : 'template')
  }

  const busy = issuingFor ?? (view.isPending ? 'view' : download.isPending ? 'download' : undefined)
  const { link } = contract

  return (
    <>
      <BookingAgreementCard
        contract={contract}
        reference={reference}
        canVoid={canVoid}
        busy={busy}
        onAction={run}
      />
      {link && (
        <>
          <ContractLinkDialog
            open={dialog === 'link'}
            onOpenChange={close}
            contract={{ ...contract, link }}
            renter={renter}
            companyName={companyName}
            subdomain={subdomain}
            reference={reference}
          />
          <CounterSignDialog
            open={dialog === 'counter'}
            onOpenChange={close}
            reference={reference}
            subdomain={subdomain}
            link={link}
            renterName={renter.name}
          />
        </>
      )}
      <VoidContractDialog
        open={dialog === 'void'}
        onOpenChange={close}
        reference={reference}
        signed={contract.status === 'signed'}
      />
      <ChangeTemplateDialog
        open={dialog === 'template'}
        onOpenChange={close}
        reference={reference}
        currentId={contract.template.id}
      />
    </>
  )
}
