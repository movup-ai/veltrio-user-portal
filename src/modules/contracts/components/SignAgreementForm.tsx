import { useId, useState } from 'react'
import { PenLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { normalizeApiError } from '@/services/api/errors'
import { SIGNER_NAME_MAX } from '../constants/booking-contract.constants'
import type { SignatureInput } from '../types/booking-contract.types'
import { drawingProblem, signatureProblems, type SignatureDraft } from '../utils/booking-contract.utils'
import { SignaturePad } from './SignaturePad'

interface SignAgreementFormProps {
  /** The renter's name as the booking has it, to save retyping; they can correct it. */
  defaultName: string
  submitting: boolean
  /** The last attempt's failure, shown beside the signature rather than in a toast. */
  error: unknown
  onSubmit: (input: SignatureInput) => void
}

/** Consent, a typed name and a signature: what the renter gives to sign, on their phone or at the counter. */
export function SignAgreementForm({ defaultName, submitting, error, onSubmit }: SignAgreementFormProps) {
  const { t } = useTranslation('contracts')
  const consentId = useId()
  const typedId = useId()
  const [draft, setDraft] = useState<SignatureDraft>({ name: defaultName, consent: false, typed: false })
  const [attempted, setAttempted] = useState(false)

  const problems = attempted ? signatureProblems(draft) : {}
  const refused = error ? (drawingProblem(error) ?? 'failed') : undefined
  const signatureError = problems.signature ?? (refused && refused !== 'failed' ? refused : undefined)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setAttempted(true)
    if (Object.keys(signatureProblems(draft)).length > 0) return
    onSubmit({ signerName: draft.name, signature: draft.drawing })
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="text-section-title m-0">{t('sign.heading')}</h2>

      <FormField label={t('sign.name')} error={problems.name && t(`sign.${problems.name}`)} required>
        {(fieldProps) => (
          <Input
            value={draft.name}
            onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
            maxLength={SIGNER_NAME_MAX}
            placeholder={t('sign.namePlaceholder')}
            autoComplete="name"
            {...fieldProps}
          />
        )}
      </FormField>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">{t('sign.signature')}</span>
        {draft.typed ? (
          <p className="border-input bg-surface-2 text-fg-2 m-0 rounded-[10px] border px-3 py-4 text-[13px]">
            {t('sign.typedNote')}
          </p>
        ) : (
          <SignaturePad
            label={t('sign.draw')}
            clearLabel={t('sign.clear')}
            invalid={Boolean(signatureError)}
            onChange={(drawing) => setDraft((d) => ({ ...d, drawing }))}
          />
        )}
        {signatureError && (
          <p role="alert" className="text-caption text-error m-0">
            {t(`sign.${signatureError}`)}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Checkbox
            id={typedId}
            checked={draft.typed}
            // The pad unmounts with its drawing, so the drawing is dropped here too.
            onCheckedChange={(checked) => setDraft((d) => ({ ...d, typed: checked === true, drawing: undefined }))}
          />
          <Label htmlFor={typedId} className="text-fg-2 text-[13px] font-normal">
            {t('sign.typeInstead')}
          </Label>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2.5">
          <Checkbox
            id={consentId}
            className="mt-0.5"
            checked={draft.consent}
            aria-invalid={Boolean(problems.consent) || undefined}
            onCheckedChange={(checked) => setDraft((d) => ({ ...d, consent: checked === true }))}
          />
          <Label htmlFor={consentId} className="text-[13.5px] leading-snug font-normal">
            {t('sign.consent')}
          </Label>
        </div>
        {problems.consent && (
          <p role="alert" className="text-caption text-error m-0">
            {t(`sign.${problems.consent}`)}
          </p>
        )}
      </div>

      {refused === 'failed' && (
        <p role="alert" className="text-caption text-error m-0">
          {t('sign.failed')} {normalizeApiError(error).message}
        </p>
      )}

      <Button type="submit" loading={submitting} className="w-full gap-1.5">
        <PenLine className="size-4" aria-hidden />
        {t('sign.submit')}
      </Button>
    </form>
  )
}
