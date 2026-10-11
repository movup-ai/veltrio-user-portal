import { useState } from 'react'
import { UserRoundSearch } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
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
import { Input } from '@/components/ui/input'
import { useFormatters } from '@/i18n'
import { toCustomerConflict } from '@/modules/customers/api/customer.mapper'
import { CustomerConflictDialog } from '@/modules/customers/components/CustomerConflictDialog'
import { DAY_FORMAT } from '@/modules/customers/constants/customer.constants'
import type { CustomerConflict } from '@/modules/customers/types/customer.types'
import { useSettleRenter } from '../hooks/use-booking-request'
import type { RenterAnswer, RenterMismatch } from '../types/booking.types'

interface Props {
  reference: string
  mismatch: RenterMismatch
}

/**
 * A request whose renter typed details that differ from the customer their email named. The
 * renter could not be asked, so the counter says who they are before it can be accepted.
 */
export function BookingRenterMismatch({ reference, mismatch }: Props) {
  const { t } = useTranslation('bookings')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const settle = useSettleRenter(reference)
  const [askingEmail, setAskingEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [conflict, setConflict] = useState<CustomerConflict>()
  // Kept so "different person, continue" can repeat the same answer with the licence allowed.
  const [lastAnswer, setLastAnswer] = useState<RenterAnswer>()

  const { onFile, submitted } = mismatch
  const day = (value: string) => format.date(`${value}T00:00:00`, DAY_FORMAT)
  const emailValid = z.email().safeParse(email.trim()).success

  function answer(next: RenterAnswer, allowSharedLicence = false) {
    setLastAnswer(next)
    settle.mutate(
      { answer: next, allowSharedLicence },
      {
        onSuccess: () => {
          setConflict(undefined)
          setAskingEmail(false)
        },
        onError: (error) => setConflict(toCustomerConflict(error)),
      },
    )
  }

  const sides = [
    { title: t('details.renterMismatch.typed'), person: submitted },
    { title: t('details.renterMismatch.onFile'), person: onFile },
  ]

  return (
    <section className="bg-error-tint border-error/25 flex flex-col gap-3 rounded-xl border px-[18px] py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="bg-surface text-error flex size-8 shrink-0 items-center justify-center rounded-[9px]">
          <UserRoundSearch className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-panel-title m-0">{t('details.renterMismatch.title')}</h2>
          <p className="text-fg-3 m-0 text-[12px]">{t('details.renterMismatch.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {sides.map(({ title, person }) => (
          <dl key={title} className="bg-surface m-0 rounded-md p-3 text-[13px]">
            <dt className="text-fg-3 text-[12px]">{title}</dt>
            <dd className="m-0 font-semibold">{person.name}</dd>
            <dd className="m-0">{t('details.renterMismatch.born', { date: day(person.dateOfBirth) })}</dd>
            <dd className="m-0 font-mono">{person.licenceNumber}</dd>
            <dd className="text-fg-3 m-0">{person.phone}</dd>
          </dl>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => answer({ customerId: onFile.id })} loading={settle.isPending && !askingEmail}>
          {t('details.renterMismatch.samePerson')}
        </Button>
        <Button variant="outline" onClick={() => setAskingEmail(true)} disabled={settle.isPending}>
          {t('details.renterMismatch.differentPerson')}
        </Button>
      </div>

      <Dialog open={askingEmail} onOpenChange={setAskingEmail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('details.renterMismatch.emailTitle')}</DialogTitle>
            <DialogDescription>
              {t('details.renterMismatch.emailDescription', { email: onFile.email })}
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              setAttempted(true)
              if (emailValid) answer({ email: email.trim() })
            }}
          >
            <FormField
              label={t('details.renterMismatch.emailLabel')}
              required
              error={attempted && !emailValid ? t('details.renterMismatch.emailInvalid') : undefined}
            >
              {(fieldProps) => (
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  {...fieldProps}
                />
              )}
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAskingEmail(false)}>
                {tCommon('actions.cancel')}
              </Button>
              <Button type="submit" loading={settle.isPending && !conflict}>
                {t('details.renterMismatch.saveAsNew')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomerConflictDialog
        conflict={conflict}
        onClose={() => setConflict(undefined)}
        sameLabel={t('details.renterMismatch.useThisCustomer')}
        onSame={(customer) => answer({ customerId: customer.id })}
        onDifferent={lastAnswer ? () => answer(lastAnswer, true) : undefined}
        pending={settle.isPending}
      />
    </section>
  )
}
