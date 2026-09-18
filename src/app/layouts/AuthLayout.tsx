import { Car } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function AuthLayout() {
  const { t } = useTranslation('common')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted px-4 py-12">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Car className="size-5" aria-hidden />
        </div>
        <span className="text-section-title">{t('brand')}</span>
      </div>
      {/* Each screen brings its own card: Clerk's components are already framed. */}
      <Outlet />
    </div>
  )
}
