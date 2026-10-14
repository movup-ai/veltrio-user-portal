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
import { useFormatters } from '@/i18n'
import { cn } from '@/lib/utils'
import { useBuyPack } from '../hooks/use-billing'
import type { CreditPack } from '../types/billing.types'
import { pricePerCredit } from '../utils/billing.utils'

interface BuyCreditsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packs: CreditPack[]
  currency: string
}

/** Picks a credit pack and leaves for Stripe's checkout to pay for it. */
export function BuyCreditsDialog({ open, onOpenChange, packs, currency }: BuyCreditsDialogProps) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const buy = useBuyPack()
  // The middle pack to start with: the first is rarely enough and the last is a commitment.
  const [picked, setPicked] = useState(packs[Math.floor(packs.length / 2)]?.key)
  const pack = packs.find((option) => option.key === picked)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t('billing.credits.buyDialog.title')}</DialogTitle>
          <DialogDescription>{t('billing.credits.buyDialog.description')}</DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={picked}
          onValueChange={setPicked}
          aria-label={t('billing.credits.buyDialog.packs')}
          className="gap-2"
        >
          {packs.map((option) => (
            <Label
              key={option.key}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-3',
                option.key === picked ? 'border-primary' : 'border-border',
              )}
            >
              <RadioGroupItem value={option.key} />
              <span className="flex flex-1 flex-wrap items-baseline gap-x-2">
                <span className="text-[14px] font-semibold">
                  {t('billing.credits.buyDialog.pack', { count: option.credits })}
                </span>
                <span className="text-fg-4 text-[12.5px] font-normal">
                  {t('billing.credits.buyDialog.perCredit', {
                    price: format.currency(pricePerCredit(option), currency),
                  })}
                </span>
              </span>
              <span className="text-[14px] font-semibold">{format.currency(option.price, currency)}</span>
            </Label>
          ))}
        </RadioGroup>

        <div className="border-border-soft flex items-center justify-between border-t pt-4">
          <span className="text-fg-3 text-[13.5px]">{t('billing.credits.buyDialog.total')}</span>
          <span className="text-[18px] font-semibold">
            {pack ? format.currency(pack.price, currency) : ''}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('actions.cancel')}
          </Button>
          {/* The page leaves for Stripe on success, so the button stays busy and nothing closes. */}
          <Button
            disabled={!pack}
            loading={buy.isPending || buy.isSuccess}
            onClick={() => pack && buy.mutate(pack.key)}
          >
            {t('billing.credits.buyDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
