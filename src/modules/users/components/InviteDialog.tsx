import { useMemo, useState } from 'react'
import { BriefcaseBusiness, KeyRound, Mail, User, UserPlus, type LucideIcon } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { ApiError } from '@/types/api'
import type { MembershipRole } from '@/types/user'
import { useInvite } from '../hooks/use-invitations'
import { MEMBERSHIP_ROLES, type SentInvitation } from '../types/users.types'

function inviteSchema(t: TFunction<'settings'>) {
  return z.object({
    email: z.string().trim().email(t('users.invite.emailInvalid')),
    role: z.enum(MEMBERSHIP_ROLES),
  })
}

type InviteValues = z.infer<ReturnType<typeof inviteSchema>>

// The two refusals that are about the address, so they belong under its field.
const EMAIL_ERRORS = ['already_member', 'invitation_pending'] as const

const ROLE_ICONS: Record<MembershipRole, LucideIcon> = {
  owner: KeyRound,
  manager: BriefcaseBusiness,
  staff: User,
}

export function InviteDialog({
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent: (invitation: SentInvitation) => void
}) {
  const { t } = useTranslation('settings')
  const { t: tNav } = useTranslation('nav')
  const { t: tCommon } = useTranslation('common')
  const invite = useInvite()
  const [formError, setFormError] = useState<string>()
  const schema = useMemo(() => inviteSchema(t), [t])
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<InviteValues>({ resolver: zodResolver(schema), defaultValues: { email: '', role: 'staff' } })

  const close = (next: boolean) => {
    if (!next) {
      reset()
      setFormError(undefined)
    }
    onOpenChange(next)
  }

  const onSubmit = (values: InviteValues) => {
    setFormError(undefined)
    invite.mutate(values, {
      onSuccess: (sent) => {
        close(false)
        onSent(sent)
      },
      onError: (error) => {
        const code = error instanceof ApiError ? error.code : undefined
        const emailError = EMAIL_ERRORS.find((known) => known === code)
        if (emailError)
          setError('email', { message: t(`users.invite.errors.${emailError}`) }, { shouldFocus: true })
        else setFormError(error.message)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[560px]">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <DialogHeader className="flex-row items-start gap-3.5">
            <span className="bg-tint text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
              <UserPlus className="size-5" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <DialogTitle>{t('users.invite.title')}</DialogTitle>
              <DialogDescription>{t('users.invite.description')}</DialogDescription>
            </div>
          </DialogHeader>

          <FormField label={t('users.invite.email')} error={errors.email?.message} required>
            {(fieldProps) => (
              <div className="relative">
                <Mail className="text-fg-4 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  type="email"
                  autoComplete="off"
                  placeholder={t('users.invite.emailPlaceholder')}
                  className="pl-9"
                  {...register('email')}
                  {...fieldProps}
                />
              </div>
            )}
          </FormField>

          <div className="flex flex-col gap-1.5">
            <span className="text-label" id="invite-role">
              {t('users.invite.role')}
            </span>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-labelledby="invite-role"
                  className="gap-2"
                >
                  {MEMBERSHIP_ROLES.map((role) => {
                    const Icon = ROLE_ICONS[role]
                    const picked = field.value === role
                    return (
                      <Label
                        key={role}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-3 transition-colors',
                          picked ? 'border-primary bg-tint' : 'border-border hover:bg-surface-2',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-lg',
                            picked ? 'bg-primary-solid text-solid-foreground' : 'bg-surface-3 text-fg-3',
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-[14px] font-semibold">{tNav(`sidebar.roles.${role}`)}</span>
                          <span className="text-fg-3 text-[12.5px] font-normal">
                            {t(`users.invite.roles.${role}`)}
                          </span>
                        </span>
                        <RadioGroupItem value={role} />
                      </Label>
                    )
                  })}
                </RadioGroup>
              )}
            />
          </div>

          {formError && (
            <p role="alert" className="text-error m-0 text-[13px]">
              {formError}
            </p>
          )}

          {/* A column, not the footer's reversed one, so on a phone the note sits above the buttons. */}
          <DialogFooter className="border-border-soft flex-col items-center border-t pt-4 sm:justify-between">
            <span className="text-fg-4 text-[12.5px]">{t('users.invite.expiry')}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => close(false)}
                disabled={invite.isPending}
              >
                {tCommon('actions.cancel')}
              </Button>
              <Button type="submit" loading={invite.isPending}>
                {t('users.invite.submit')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
