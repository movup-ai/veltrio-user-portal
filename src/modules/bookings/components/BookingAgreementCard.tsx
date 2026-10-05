import { FileDown, FileText, MoreVertical, PenLine, Send, Tablet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { useFormatters } from '@/i18n'
import type { BookingContract } from '@/modules/contracts/types/booking-contract.types'
import { contractFileName } from '@/modules/contracts/utils/booking-contract.utils'

export type AgreementAction = 'view' | 'download' | 'send' | 'signAtCounter' | 'changeTemplate' | 'shareCopy' | 'void'

interface BookingAgreementCardProps {
  contract: BookingContract
  /** Names the file the renter receives — the booking reference. */
  reference: string
  /** Voiding undoes a signature, so the API keeps it to owners and managers. */
  canVoid: boolean
  /** The action in flight, whose button shows it. */
  busy?: AgreementAction
  onAction: (action: AgreementAction) => void
}

/**
 * The rental contract. Kept apart from the checklist because it isn't a check staff perform —
 * it's a document that goes out, comes back signed, and has to stay retrievable for years
 * afterwards.
 */
export function BookingAgreementCard({ contract, reference, canVoid, busy, onAction }: BookingAgreementCardProps) {
  const { t } = useTranslation('bookings')
  const { t: tContracts } = useTranslation('contracts')
  const format = useFormatters()
  const signed = contract.status === 'signed'
  const { sign, changeTemplate } = contract.actions
  const signHint = sign.reason ? tContracts(`reasons.${sign.reason}`) : undefined

  const renter = signed
    ? t('details.agreement.renterSigned', {
        name: contract.signerName ?? '—',
        when: contract.signedAt ? format.date(contract.signedAt, { month: 'short', day: 'numeric' }) : '—',
        method: t(`details.agreement.method.${contract.method ?? 'e_signature'}`),
      })
    : t('details.agreement.unsignedNote')
  // One row a party, then the terms: who signed reads down the left edge without a sentence each.
  const rows = [
    { label: t('details.agreement.rows.renter'), value: renter },
    ...(contract.companySigner
      ? [{ label: t('details.agreement.rows.company'), value: contract.companySigner }]
      : []),
    { label: t('details.agreement.rows.terms'), value: t('details.agreement.template', contract.template) },
  ]

  const menu = [
    ...(changeTemplate.allowed ? (['changeTemplate'] as const) : []),
    ...(signed && contract.link ? (['shareCopy'] as const) : []),
    ...(canVoid && contract.actions.void.allowed ? (['void'] as const) : []),
  ]

  return (
    <Card as="section" className="flex flex-col p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-panel-title m-0">{t('details.agreement.title')}</h2>
        <div className="flex items-center gap-1">
          <StatusBadge
            status={signed ? 'Completed' : 'Pending'}
            label={t(`details.agreement.badge.${contract.status}`)}
          />
          {menu.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" aria-label={t('details.agreement.more')}>
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menu.map((action) => (
                  <DropdownMenuItem
                    key={action}
                    className={action === 'void' ? 'text-error focus:text-error' : undefined}
                    onClick={() => onAction(action)}
                  >
                    {t(`details.agreement.${action}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Stacked rather than inline: the card sits in the narrow column, where a row of file
          details plus two buttons wraps into something worse than a deliberate stack. */}
      <div className="border-border bg-surface-2 mt-3.5 flex flex-col gap-2.5 rounded-[10px] border p-3">
        <div className="flex items-center gap-2.5">
          <span className="border-border bg-surface text-fg-3 flex size-9 shrink-0 items-center justify-center rounded-[8px] border">
            <FileText className="size-4" aria-hidden />
          </span>
          <p className="m-0 min-w-0 flex-1 truncate text-[13px] font-semibold">{contractFileName(reference)}</p>
        </div>

        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-fg-4">{row.label}</dt>
              <dd className="text-fg-2 m-0 min-w-0">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={busy === 'view'}
            onClick={() => onAction('view')}
            className="gap-1.5"
          >
            <FileText className="size-3.5" aria-hidden />
            {t('details.agreement.view')}
          </Button>
          {signed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={busy === 'download'}
              onClick={() => onAction('download')}
              className="gap-1.5"
            >
              <FileDown className="size-3.5" aria-hidden />
              {t('details.agreement.download')}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={!sign.allowed}
              title={signHint}
              loading={busy === 'send'}
              onClick={() => onAction('send')}
              className="gap-1.5"
            >
              <Send className="size-3.5" aria-hidden />
              {t('details.agreement.send')}
            </Button>
          )}
          {!signed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!sign.allowed}
              title={signHint}
              loading={busy === 'signAtCounter'}
              onClick={() => onAction('signAtCounter')}
              className="col-span-2 gap-1.5"
            >
              <Tablet className="size-3.5" aria-hidden />
              {t('details.agreement.signAtCounter')}
            </Button>
          )}
        </div>
      </div>

      {!signed && sign.allowed && (
        <p className="text-fg-4 m-0 mt-2.5 flex items-center gap-1.5 text-[12px]">
          <PenLine className="size-3.5 shrink-0" aria-hidden />
          {t('details.agreement.blockingHandover')}
        </p>
      )}
    </Card>
  )
}
