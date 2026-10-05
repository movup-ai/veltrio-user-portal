import { useMemo } from 'react'
import { FileDown, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { useFormatters } from '@/i18n'
import { bookingContractApi } from '@/modules/contracts/api/booking-contract.api'
import { AgreementDocument } from '@/modules/contracts/components/AgreementDocument'
import { SignAgreementForm } from '@/modules/contracts/components/SignAgreementForm'
import { usePublicContract, usePublicSign } from '@/modules/contracts/hooks/use-booking-contract'
import type { ContractLink, PublicContract } from '@/modules/contracts/types/booking-contract.types'
import { CompanyBadge, PublicNotice, PublicPanel } from '@/modules/payments/components/PublicPage'
import { linkIsGone } from '@/modules/payments/utils/booking-payment.utils'

/** Wide enough to read terms comfortably; the payment pages' card is sized for a card form. */
const WIDE = 'max-w-[760px]'

/**
 * Where the renter reads and signs their rental agreement, from the link the counter sent.
 * Needs no login: the token in the link is the proof. Once signed, the same link is their copy.
 */
export function SignPage() {
  const { t } = useTranslation('contracts')
  const { tenantId = '', contractId = '', token = '' } = useParams()
  const link = useMemo<ContractLink>(() => ({ tenantId, contractId, token }), [tenantId, contractId, token])
  const { data: agreement, isLoading, error, refetch, isRefetching } = usePublicContract(link)

  if (isLoading) return <LoadingState />
  if (!agreement) {
    if (error && !linkIsGone(error)) {
      return (
        <PublicPanel>
          <PublicNotice icon="clock" title={t('page.unreachable.title')} body={t('page.unreachable.body')} />
          <Button type="button" loading={isRefetching} onClick={() => void refetch()} className="w-full">
            {t('page.unreachable.retry')}
          </Button>
        </PublicPanel>
      )
    }
    return (
      <PublicPanel>
        <PublicNotice icon="alert" title={t('page.invalid.title')} body={t('page.invalid.body')} />
      </PublicPanel>
    )
  }

  const values = { company: agreement.companyName, reference: agreement.reference }
  if (agreement.status === 'replaced' || agreement.status === 'closed') {
    return (
      <PublicPanel>
        <CompanyBadge companyName={agreement.companyName} reference={agreement.reference} />
        <PublicNotice
          icon="alert"
          title={t(`page.${agreement.status}.title`)}
          body={t(`page.${agreement.status}.body`, values)}
        />
      </PublicPanel>
    )
  }
  return agreement.status === 'signed' ? (
    <Signed agreement={agreement} link={link} />
  ) : (
    <Open agreement={agreement} link={link} />
  )
}

function Open({ agreement, link }: { agreement: PublicContract; link: ContractLink }) {
  const { t } = useTranslation('contracts')
  const sign = usePublicSign(link)

  return (
    <div className={`flex w-full ${WIDE} flex-col gap-3`}>
      <PublicPanel className={WIDE}>
        <CompanyBadge companyName={agreement.companyName} reference={agreement.reference} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-section-title m-0">{t('page.title')}</h1>
            <p className="text-description m-0 mt-0.5">
              {t('page.greeting', { name: agreement.renterName.split(/\s+/)[0] })}
            </p>
          </div>
          <DownloadButton link={link} label={t('page.download')} />
        </div>
        <AgreementDocument content={agreement} />
        <div className="border-border-soft border-t pt-5">
          <SignAgreementForm
            defaultName={agreement.renterName}
            submitting={sign.isPending}
            error={sign.error}
            onSubmit={(input) => sign.mutate(input)}
          />
        </div>
      </PublicPanel>
      <p className="text-fg-4 m-0 flex items-center justify-center gap-1.5 text-[12px]">
        <Lock className="size-3.5" aria-hidden />
        {t('page.secure')}
      </p>
    </div>
  )
}

function Signed({ agreement, link }: { agreement: PublicContract; link: ContractLink }) {
  const { t } = useTranslation('contracts')
  const format = useFormatters()
  const date = agreement.signedAt
    ? format.date(agreement.signedAt, { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <PublicPanel className={WIDE}>
      <CompanyBadge companyName={agreement.companyName} reference={agreement.reference} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-section-title m-0">{t('page.title')}</h1>
        <DownloadButton link={link} label={t('page.downloadCopy')} />
      </div>
      <AgreementDocument content={agreement} />
      {/* At the foot, where the signing form was: the renter has just signed there. */}
      <div className="border-border-soft flex flex-col gap-4 border-t pt-5">
        <PublicNotice
          icon="check"
          title={t('page.signed.title')}
          body={t('page.signed.body', { name: agreement.signerName ?? agreement.renterName, date })}
        />
        <DownloadButton link={link} label={t('page.downloadCopy')} primary />
      </div>
    </PublicPanel>
  )
}

/** A plain link: the PDF is public behind the token, so the browser can fetch it directly. */
function DownloadButton({ link, label, primary }: { link: ContractLink; label: string; primary?: boolean }) {
  return (
    <Button variant={primary ? 'primary' : 'outline'} size={primary ? 'md' : 'sm'} asChild className="gap-1.5">
      <a href={bookingContractApi.publicPdfUrl(link)}>
        <FileDown className="size-4" aria-hidden />
        {label}
      </a>
    </Button>
  )
}
