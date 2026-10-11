import { TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { CustomerOnFile } from '@/modules/customers/components/CustomerOnFile'
import type { CustomerMatch } from '@/modules/customers/types/customer.types'

interface Props {
  /** The booking's own customer, whose page is where two records are merged. */
  customerId?: string
  duplicates: CustomerMatch[]
}

/**
 * Says the renter looks like a customer already on file. A renter who books online under a
 * second email becomes a second customer unasked, and their request is the first place staff
 * can catch it: before accepting, and before paying for a check on the wrong record.
 */
export function BookingRenterDuplicates({ customerId, duplicates }: Props) {
  const { t } = useTranslation('bookings')
  const { t: tCustomers } = useTranslation('customers')
  const navigate = useNavigate()

  return (
    <section className="bg-warning-tint border-warning/25 flex flex-col gap-3 rounded-xl border px-[18px] py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="bg-surface text-warning flex size-8 shrink-0 items-center justify-center rounded-[9px]">
          <TriangleAlert className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-panel-title m-0">{t('details.renterDuplicates.title')}</h2>
          <p className="text-fg-3 m-0 text-[12px]">{t('details.renterDuplicates.subtitle')}</p>
        </div>
        {customerId && (
          <Button size="sm" className="shrink-0" onClick={() => navigate(`/customers/${customerId}`)}>
            {t('details.renterDuplicates.openRenter')}
          </Button>
        )}
      </div>
      {duplicates.map(({ customer, reasons }) => (
        <div key={customer.id} className="bg-surface rounded-md">
          <CustomerOnFile
            customer={customer}
            reasons={reasons}
            action={
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                {tCustomers('form.openCustomer')}
              </Button>
            }
          />
        </div>
      ))}
    </section>
  )
}
