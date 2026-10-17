import { useMemo, useState } from 'react'
import { LifeBuoy } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { MAX_MESSAGE_LENGTH, MAX_SUBJECT_LENGTH } from '../constants/support.constants'
import { useAttachmentUploads } from '../hooks/use-attachment-uploads'
import { useCreateTicket } from '../hooks/use-support'
import { TICKET_CATEGORIES, type Ticket } from '../types/support.types'
import { AttachmentPicker } from './AttachmentPicker'

function ticketSchema(t: TFunction<'support'>) {
  return z.object({
    subject: z.string().trim().min(1, t('form.subjectRequired')).max(MAX_SUBJECT_LENGTH),
    category: z.enum(TICKET_CATEGORIES),
    body: z.string().trim().min(1, t('form.bodyRequired')).max(MAX_MESSAGE_LENGTH),
  })
}

type TicketValues = z.infer<ReturnType<typeof ticketSchema>>

export function NewTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (ticket: Ticket) => void
}) {
  const { t } = useTranslation('support')
  const { t: tCommon } = useTranslation('common')
  const create = useCreateTicket()
  const uploads = useAttachmentUploads()
  const [formError, setFormError] = useState<string>()
  const schema = useMemo(() => ticketSchema(t), [t])
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TicketValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: '', category: 'question', body: '' },
  })

  const close = (next: boolean) => {
    if (!next) {
      reset()
      uploads.reset()
      setFormError(undefined)
    }
    onOpenChange(next)
  }

  const onSubmit = (values: TicketValues) => {
    if (uploads.pending) {
      setFormError(t('attachments.pending'))
      return
    }
    setFormError(undefined)
    create.mutate(
      { ...values, attachmentIds: uploads.ids },
      {
        onSuccess: (ticket) => {
          close(false)
          onCreated(ticket)
        },
        onError: (error) => setFormError(error.message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[560px]">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <DialogHeader className="flex-row items-start gap-3.5">
            <span className="bg-tint text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
              <LifeBuoy className="size-5" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <DialogTitle>{t('form.title')}</DialogTitle>
              <DialogDescription>{t('form.description')}</DialogDescription>
            </div>
          </DialogHeader>

          <FormField label={t('form.subject')} error={errors.subject?.message} required>
            {(fieldProps) => (
              <Input
                maxLength={MAX_SUBJECT_LENGTH}
                placeholder={t('form.subjectPlaceholder')}
                {...register('subject')}
                {...fieldProps}
              />
            )}
          </FormField>

          <FormField label={t('form.category')}>
            {({ id }) => (
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={id}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {t(`categories.${category}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>

          <FormField
            label={t('form.body')}
            description={t('form.bodyHint')}
            error={errors.body?.message}
            required
          >
            {(fieldProps) => (
              <Textarea rows={6} maxLength={MAX_MESSAGE_LENGTH} {...register('body')} {...fieldProps} />
            )}
          </FormField>

          <AttachmentPicker uploads={uploads} disabled={create.isPending} />

          {formError && (
            <p role="alert" className="text-error m-0 text-[13px]">
              {formError}
            </p>
          )}

          <DialogFooter className="border-border-soft border-t pt-4">
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={create.isPending}>
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" loading={create.isPending}>
              {t('form.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
