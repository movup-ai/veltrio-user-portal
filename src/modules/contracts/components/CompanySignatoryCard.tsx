import { useId, useState } from 'react'
import { Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { SettingsCard } from '@/modules/settings/components/SettingsCard'
import { normalizeApiError } from '@/services/api/errors'
import { SIGNATORY_TITLE_MAX, SIGNER_NAME_MAX } from '../constants/booking-contract.constants'
import {
  useCompanySignatory,
  useRemoveCompanySignatory,
  useSaveCompanySignatory,
} from '../hooks/use-company-signatory'
import type { CompanySignatory } from '../types/company-signatory.types'
import { drawingProblem, type DrawingProblem } from '../utils/booking-contract.utils'
import {
  isSignatoryDirty,
  signatoryDraft,
  signatoryInput,
  signatoryProblems,
  type SignatoryDraft,
} from '../utils/company-signatory.utils'
import { SignaturePad } from './SignaturePad'

/** Who signs agreements for the company: set once by the owner, applied to each one as it is issued. */
export function CompanySignatoryCard() {
  const { data: signatory, isLoading, refetch } = useCompanySignatory()

  if (isLoading) {
    return (
      <Card as="section" className="p-[18px]">
        <LoadingState />
      </Card>
    )
  }
  if (!signatory) {
    return (
      <Card as="section" className="p-[18px]">
        <ErrorState onRetry={() => void refetch()} />
      </Card>
    )
  }
  // Keyed on what is saved, so a save or a removal reopens the form from the new baseline.
  return <SignatoryForm key={`${signatory.name}|${signatory.title}|${signatory.signature}`} saved={signatory} />
}

function SignatoryForm({ saved }: { saved: CompanySignatory }) {
  const { t } = useTranslation('contracts')
  const typedId = useId()
  const save = useSaveCompanySignatory()
  const remove = useRemoveCompanySignatory()
  const [draft, setDraft] = useState<SignatoryDraft>(() => signatoryDraft(saved))
  const [attempted, setAttempted] = useState(false)
  // The API's refusal of the last drawing sent, cleared as soon as the drawing changes.
  const [refused, setRefused] = useState<DrawingProblem>()

  const problems = attempted ? signatoryProblems(draft) : {}
  const signatureError = problems.signature ?? refused

  const submit = async (event?: React.BaseSyntheticEvent) => {
    event?.preventDefault()
    setAttempted(true)
    if (Object.keys(signatoryProblems(draft)).length > 0) return
    try {
      await save.mutateAsync(signatoryInput(draft, saved))
    } catch (error) {
      const drawing = drawingProblem(error)
      if (drawing) return setRefused(drawing)
      toast({ title: t('signatory.toast.failed'), description: normalizeApiError(error).message, variant: 'error' })
    }
  }

  return (
    <SettingsCard
      title={t('signatory.title')}
      description={t('signatory.description')}
      onSubmit={submit}
      onDiscard={() => {
        setDraft(signatoryDraft(saved))
        setAttempted(false)
        setRefused(undefined)
      }}
      dirty={isSignatoryDirty(draft, saved)}
      saving={save.isPending}
      actions={
        saved.name && (
          <Button type="button" variant="outline" size="sm" loading={remove.isPending} onClick={() => remove.mutate()}>
            {t('signatory.remove')}
          </Button>
        )
      }
    >
      {!saved.name && <p className="text-fg-3 m-0 text-[13px] sm:col-span-2">{t('signatory.unset')}</p>}

      <FormField label={t('signatory.name')} error={problems.name && t(`signatory.${problems.name}`)} required>
        {(fieldProps) => (
          <Input
            value={draft.name}
            onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
            maxLength={SIGNER_NAME_MAX}
            autoComplete="name"
            {...fieldProps}
          />
        )}
      </FormField>

      <FormField label={t('signatory.jobTitle')}>
        {(fieldProps) => (
          <Input
            value={draft.title}
            onChange={(event) => setDraft((d) => ({ ...d, title: event.target.value }))}
            maxLength={SIGNATORY_TITLE_MAX}
            placeholder={t('signatory.jobTitlePlaceholder')}
            autoComplete="organization-title"
            {...fieldProps}
          />
        )}
      </FormField>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-[13px] font-medium">{t('signatory.signature')}</span>
        {draft.mode === 'kept' && saved.signature && (
          // The pad's own size and corner control, so swapping to the pad does not shift the card.
          <div className="border-input relative flex h-[160px] items-center justify-center rounded-[10px] border bg-white">
            <img
              src={saved.signature}
              alt={t('signatory.signatureOf', { name: saved.name })}
              className="max-h-full max-w-full object-contain"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('signatory.redraw')}
              title={t('signatory.redraw')}
              onClick={() => setDraft((d) => ({ ...d, mode: 'draw' }))}
              className="absolute top-1.5 right-1.5 size-7 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Pencil className="size-3.5" aria-hidden />
            </Button>
          </div>
        )}
        {draft.mode === 'draw' && (
          <SignaturePad
            label={t('sign.draw')}
            clearLabel={t('sign.clear')}
            invalid={Boolean(signatureError)}
            onChange={(drawing) => {
              setRefused(undefined)
              setDraft((d) => ({ ...d, drawing }))
            }}
          />
        )}
        {draft.mode === 'typed' && (
          <p className="border-input bg-surface-2 text-fg-2 m-0 rounded-[10px] border px-3 py-4 text-[13px]">
            {t('signatory.typedNote')}
          </p>
        )}
        {signatureError && draft.mode === 'draw' && (
          <p role="alert" className="text-caption text-error m-0">
            {t(`sign.${signatureError}`)}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Checkbox
            id={typedId}
            checked={draft.mode === 'typed'}
            // Unticking returns to the signature on file if there is one, else to the pad.
            onCheckedChange={(checked) =>
              setDraft((d) => ({
                ...d,
                drawing: undefined,
                mode: checked === true ? 'typed' : saved.signature ? 'kept' : 'draw',
              }))
            }
          />
          <Label htmlFor={typedId} className="text-fg-2 text-[13px] font-normal">
            {t('signatory.typeInstead')}
          </Label>
        </div>
      </div>
    </SettingsCard>
  )
}
