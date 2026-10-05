import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { AgreementContent } from '../types/booking-contract.types'

/**
 * The agreement as the renter reads it before signing: the rental in summary, then the terms.
 * Every value arrives worded by the API, so the page and the PDF it stands for cannot differ.
 */
export function AgreementDocument({ content }: { content: AgreementContent }) {
  const { t } = useTranslation('contracts')
  const signed = content.companySignature

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {content.sections.map((section) => (
          <section key={section.title}>
            <Heading>{section.title}</Heading>
            <dl className="m-0 mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
              {section.rows.map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-fg-3">{row.label}</dt>
                  {/* pre-line: pickup and return carry their place on a second line, as the PDF does. */}
                  <dd className="m-0 min-w-0 break-words whitespace-pre-line">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <section>
        <Heading>{t('document.charges')}</Heading>
        <ul className="border-border-soft divide-border-soft m-0 mt-1.5 list-none divide-y border-y p-0">
          {content.charges.map((charge, index) => (
            <li key={index} className="flex items-start justify-between gap-3 py-2 text-[13.5px]">
              <span className="min-w-0">
                {charge.label}
                {charge.detail && <span className="text-fg-4 block text-[12px]">{charge.detail}</span>}
              </span>
              <span className="shrink-0 tabular-nums">{charge.amount}</span>
            </li>
          ))}
        </ul>
        <dl className="m-0 mt-2 ml-auto grid max-w-[320px] grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[13px]">
          {content.totals.map((total) => (
            <div key={total.label} className={cn('contents', total.strong && 'text-[15px] font-bold')}>
              <dt className={cn(!total.strong && 'text-fg-3')}>{total.label}</dt>
              <dd className="m-0 text-right tabular-nums">{total.amount}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <Heading>{t('document.terms')}</Heading>
        <div className="mt-1.5 flex flex-col gap-2 text-[13.5px] leading-relaxed">
          {content.terms.map((block, index) =>
            block.heading ? (
              <h3 key={index} className="m-0 mt-2 text-[14px] font-semibold">
                {block.text}
              </h3>
            ) : (
              // pre-line: a single line break in the template is kept, so a typed list stays a list.
              <p key={index} className="m-0 whitespace-pre-line">
                {block.text}
              </p>
            ),
          )}
        </div>
      </section>

      {signed && (
        <section>
          <Heading>{t('document.signatures')}</Heading>
          <div className="mt-1.5 flex flex-col gap-1 text-[13px]">
            <span className="text-fg-3">{t('document.forCompany')}</span>
            {signed.signature ? (
              <img
                src={signed.signature}
                alt={t('document.signatureOf', { name: signed.name })}
                className="border-border-soft h-[72px] w-fit rounded-[8px] border bg-white"
              />
            ) : (
              <span className="text-[20px] leading-tight font-bold">{signed.name}</span>
            )}
            <span className="font-semibold">{signed.title ? `${signed.name}, ${signed.title}` : signed.name}</span>
            <span className="text-fg-3">
              {signed.company} · {t('document.signedOn', { date: signed.signed })}
            </span>
            {/* Said when it is not the signatory's own act: their signature is applied on issue. */}
            {signed.issuedBy !== signed.name && (
              <span className="text-fg-4 text-[12px]">{t('document.appliedBy', { name: signed.issuedBy })}</span>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-fg-3 m-0 text-[11px] font-bold tracking-wide uppercase">{children}</h2>
}
