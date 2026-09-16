import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { authApi } from '@/services/auth/auth.api'
import { normalizeApiError } from '@/services/api/errors'
import { useAuthStore } from '@/state/auth.store'
import { useOrganizationStore } from '@/state/organization.store'

function loginSchema(t: TFunction<'auth'>) {
  return z.object({
    email: z.string().min(1, t('errors.emailRequired')).email(t('errors.emailInvalid')),
    password: z.string().min(1, t('errors.passwordRequired')),
  })
}

type LoginFormValues = z.infer<ReturnType<typeof loginSchema>>

export function LoginPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((state) => state.setSession)
  const setMemberships = useOrganizationStore((state) => state.setMemberships)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(useMemo(() => loginSchema(t), [t])) })

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null)
    try {
      const response = await authApi.login(values)
      setSession(response.user, response.accessToken)
      setMemberships(response.memberships)

      const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/app/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setFormError(normalizeApiError(error).message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-section-title">{t('login.title')}</h1>
        <p className="text-description">{t('login.subtitle')}</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label={t('login.email')} error={errors.email?.message} required>
          {(fieldProps) => <Input type="email" autoComplete="email" {...register('email')} {...fieldProps} />}
        </FormField>

        <FormField label={t('login.password')} error={errors.password?.message} required>
          {(fieldProps) => (
            <Input type="password" autoComplete="current-password" {...register('password')} {...fieldProps} />
          )}
        </FormField>

        {formError && (
          <p role="alert" className="text-caption text-error">
            {formError}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
          {t('login.submit')}
        </Button>
      </form>
    </div>
  )
}
