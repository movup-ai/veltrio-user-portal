import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { FormField } from '@/components/forms/FormField'
import { useFormatters } from '@/i18n'
import { RECHARGE_BELOW_OPTIONS } from '../constants/billing.constants'
import { useSetAutoRecharge } from '../hooks/use-billing'
import type { Credits } from '../types/billing.types'
import { rechargesNow } from '../utils/billing.utils'

interface AutoRechargeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  credits: Credits
  currency: string
}

/** Switches auto-recharge on or off, and chooses which pack is bought and when. */
export function AutoRechargeDialog({ open, onOpenChange, credits, currency }: AutoRechargeDialogProps) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const format = useFormatters()
  const save = useSetAutoRecharge()
  const current = credits.autoRecharge
  const [enabled, setEnabled] = useState(current !== undefined)
  const [pack, setPack] = useState(current?.pack ?? credits.packs[0]?.key ?? '')
  const [below, setBelow] = useState(current?.below ?? credits.lowBalance)
  // A balance saved earlier that is no longer offered still has to show as the choice it is.
  const thresholds = [...new Set([...RECHARGE_BELOW_OPTIONS, below])].sort((a, b) => a - b)
  const chosen = credits.packs.find((option) => option.key === pack)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{t('billing.credits.autoRecharge.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('billing.credits.autoRecharge.dialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="auto-recharge-enabled">{t('billing.credits.autoRecharge.enabled')}</Label>
          <Switch id="auto-recharge-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('billing.credits.autoRecharge.pack')}>
              {({ id }) => (
                <Select value={pack} onValueChange={setPack}>
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {credits.packs.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {t('billing.credits.autoRecharge.packOption', {
                          count: option.credits,
                          price: format.currency(option.price, currency),
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField label={t('billing.credits.autoRecharge.below')}>
              {({ id }) => (
                <Select value={String(below)} onValueChange={(value) => setBelow(Number(value))}>
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {thresholds.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </div>
        )}

        {/* Saving below the line is a purchase, so it says so and names the price first. */}
        {enabled && chosen && rechargesNow(credits.balance, below) && (
          <p
            role="alert"
            className="bg-warning-tint text-fg-2 m-0 flex items-start gap-2.5 rounded-[9px] px-3.5 py-3 text-[12.5px]"
          >
            <AlertTriangle className="text-warning mt-px size-4 shrink-0" aria-hidden />
            {t('billing.credits.autoRecharge.buysNow', {
              below,
              price: format.currency(chosen.price, currency),
            })}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            {tCommon('actions.cancel')}
          </Button>
          <Button
            loading={save.isPending}
            disabled={enabled && !chosen}
            onClick={() =>
              save.mutate(enabled ? { pack, below } : undefined, { onSuccess: () => onOpenChange(false) })
            }
          >
            {t('billing.credits.autoRecharge.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
