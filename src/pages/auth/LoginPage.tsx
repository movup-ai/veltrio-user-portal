import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { authApi } from '@/services/auth/auth.api'
import { normalizeApiError } from '@/services/api/errors'
import { useAuthStore } from '@/state/auth.store'
import { useOrganizationStore } from '@/state/organization.store'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((state) => state.setSession)
  const setMemberships = useOrganizationStore((state) => state.setMemberships)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

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
        <h1 className="text-section-title">Sign in</h1>
        <p className="text-description">Manage your fleet, bookings, and customers.</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Email" error={errors.email?.message} required>
          {(fieldProps) => <Input type="email" autoComplete="email" {...register('email')} {...fieldProps} />}
        </FormField>

        <FormField label="Password" error={errors.password?.message} required>
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
          Sign in
        </Button>
      </form>
    </div>
  )
}
