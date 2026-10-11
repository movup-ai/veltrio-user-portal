import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useMergeCustomers } from '../hooks/use-customers'
import type { Customer } from '../types/customer.types'
import { CustomerOnFile } from './CustomerOnFile'

interface Props {
  /** The customer whose page this is, and the duplicate picked on it. Closed without the second. */
  customer: Customer
  duplicate: Customer | undefined
  onClose: () => void
  /** Called with the customer kept, which may be either of the two. */
  onMerged: (keptId: string) => void
}

/**
 * Folds two records of one person together. The counter picks which to keep because the
 * kept record's own details stand: the API does not blend the two.
 */
export function MergeCustomerDialog({ customer, duplicate, onClose, onMerged }: Props) {
  const { t } = useTranslation('customers')
  const { t: tCommon } = useTranslation('common')
  const merge = useMergeCustomers()
  const [keepId, setKeepId] = useState(customer.id)

  function close() {
    setKeepId(customer.id)
    onClose()
  }

  function confirm() {
    if (!duplicate) return
    const sourceId = keepId === customer.id ? duplicate.id : customer.id
    merge.mutate(
      { targetId: keepId, sourceId },
      {
        onSuccess: () => {
          close()
          onMerged(keepId)
        },
      },
    )
  }

  return (
    <Dialog open={Boolean(duplicate)} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-xl">
        {duplicate && (
          <>
            <DialogHeader>
              <DialogTitle>{t('merge.title')}</DialogTitle>
              <DialogDescription className="whitespace-pre-line">{t('merge.description')}</DialogDescription>
            </DialogHeader>
            <RadioGroup
              value={keepId}
              onValueChange={setKeepId}
              aria-label={t('merge.keepLabel')}
              className="flex flex-col gap-2"
            >
              {[customer, duplicate].map((option) => (
                <Label key={option.id} className="flex cursor-pointer items-start gap-3 font-normal">
                  <RadioGroupItem value={option.id} className="mt-5" />
                  <span className="min-w-0 flex-1">
                    <CustomerOnFile customer={option} size="lg" />
                  </span>
                </Label>
              ))}
            </RadioGroup>
            <DialogFooter>
              <Button variant="outline" onClick={close} disabled={merge.isPending}>
                {tCommon('actions.cancel')}
              </Button>
              <Button onClick={confirm} loading={merge.isPending}>
                {t('merge.confirm')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
