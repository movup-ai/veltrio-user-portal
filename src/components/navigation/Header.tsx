import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/modules/notifications/components/NotificationBell'
import { GlobalSearch } from '@/modules/search/components/GlobalSearch'
import { useOrganizationStore } from '@/state/organization.store'
import { usePageActionsStore } from '@/state/page-actions.store'
import { LanguageSwitcher } from './LanguageSwitcher'
import { navKeyForPath } from './nav-items'

export function Header({ onMobileMenuClick }: { onMobileMenuClick: () => void }) {
  const { t } = useTranslation('nav')
  const location = useLocation()
  const title = t(`links.${navKeyForPath(location.pathname)}`)
  const breadcrumbExtra = usePageActionsStore((state) => state.breadcrumbExtra)
  const organizationName = useOrganizationStore((state) => state.membership?.organizationName)

  return (
    <header className="bg-header border-border sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-3.5 border-b py-0 pr-5 pl-4 backdrop-blur-lg lg:pl-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMobileMenuClick}
        aria-label={t('header.openMenu')}
      >
        <Menu />
      </Button>

      <nav
        aria-label={t('header.breadcrumb')}
        className="text-fg-4 hidden shrink-0 items-center gap-[7px] text-[13px] whitespace-nowrap sm:flex"
      >
        {organizationName && (
          <>
            <span className="max-w-[220px] truncate" title={organizationName}>
              {organizationName}
            </span>
            <span>/</span>
          </>
        )}
        {breadcrumbExtra ? (
          <>
            <span>{title}</span>
            <span>/</span>
            <span className="text-foreground max-w-[220px] truncate font-semibold">{breadcrumbExtra}</span>
          </>
        ) : (
          <span className="text-foreground font-semibold">{title}</span>
        )}
      </nav>

      <div className="flex-1" />

      <GlobalSearch />

      <NotificationBell />

      <LanguageSwitcher />
    </header>
  )
}
