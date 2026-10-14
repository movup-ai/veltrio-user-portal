import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthLegalNotice } from './AuthLegalNotice'

/**
 * Holds the form's place until Clerk draws it. Hidden by CSS the moment `.cl-card` exists rather
 * than on `ClerkLoaded`: Clerk loads, then still fetches the form's own code before drawing it.
 */
function AuthFormSkeleton({ fields }: { fields: number }) {
  const { t } = useTranslation('common')

  return (
    <div
      role="status"
      aria-label={t('states.loading')}
      className="flex w-full flex-col gap-7 group-has-[.cl-card]:hidden"
    >
      <div className="flex flex-col items-center gap-2.5">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-full" />
        <div className="bg-border h-px w-full" />
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

/** A Clerk form on the auth page: its placeholder while Clerk loads, and the legal line under it. */
export function AuthForm({ fields, children }: { fields: number; children: React.ReactNode }) {
  return (
    <div className="group flex w-full max-w-[400px] flex-col">
      <AuthFormSkeleton fields={fields} />
      {children}
      <AuthLegalNotice />
    </div>
  )
}
