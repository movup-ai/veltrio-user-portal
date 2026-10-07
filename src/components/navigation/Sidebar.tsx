import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CarFront, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/state/ui.store'
import { NAV_ITEMS, type NavLinkKey } from './nav-items'

interface SidebarProps {
  /** Renders as an overlay drawer on mobile; hidden until opened. */
  mobileOpen?: boolean
  onMobileClose?: () => void
  /** Live counts beside a link, such as reservations waiting for an answer. */
  badges?: Partial<Record<NavLinkKey, string>>
}

export function Sidebar({ mobileOpen = false, onMobileClose, badges }: SidebarProps) {
  const { t } = useTranslation(['nav', 'common'])
  const collapsed = useUIStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const theme = useUIStore((state) => state.theme)
  const setTheme = useUIStore((state) => state.setTheme)
  const expanded = !collapsed

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onMobileClose} aria-hidden />}

      <aside
        className={cn(
          'bg-surface border-border fixed inset-y-0 left-0 z-50 flex w-[242px] flex-col border-r transition-[width] duration-[180ms] ease-out',
          'lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          collapsed ? 'lg:w-[68px]' : 'lg:w-[242px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="border-border-soft flex h-[60px] shrink-0 items-center gap-2.5 border-b px-4">
          <div className="bg-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
            <CarFront className="text-primary-foreground size-4" strokeWidth={2.25} />
          </div>
          {expanded && (
            <span className="font-[family-name:var(--font-display)] text-[16px] font-bold tracking-tight">
              {t('common:brand')}
            </span>
          )}
        </div>

        <nav className="vx-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-3" aria-label={t('nav:sidebar.primary')}>
          {NAV_ITEMS.map((item) => {
            if (item.type === 'group') {
              return expanded ? (
                <div key={item.key} className="text-fg-4 px-[9px] pt-3.5 pb-1.5 text-[10.5px] font-semibold tracking-wider uppercase">
                  {t(`nav:groups.${item.key}`)}
                </div>
              ) : null
            }

            const badge = badges?.[item.key] ?? item.badge
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onMobileClose}
                title={t(`nav:links.${item.key}`)}
                className={({ isActive }) =>
                  cn(
                    'hover:bg-surface-3 flex w-full items-center gap-2.5 rounded-[9px] px-[9px] py-2 text-left text-[13.5px] font-medium transition-colors',
                    isActive ? 'bg-tint text-primary' : 'text-fg-2',
                    collapsed && 'lg:justify-center lg:px-2',
                  )
                }
              >
                <item.icon className="size-[17px] shrink-0" />
                {expanded && <span className="flex-1 overflow-hidden whitespace-nowrap">{t(`nav:links.${item.key}`)}</span>}
                {badge && expanded && (
                  <span
                    className="min-w-5 shrink-0 rounded-full px-1.5 py-px text-center font-mono text-[11px] font-semibold"
                    style={{
                      background: item.urgent ? 'var(--color-error-tint)' : 'var(--color-surface-3)',
                      color: item.urgent ? 'var(--color-error)' : 'var(--color-fg-3)',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-border-soft border-t px-3 py-2.5">
          <button
            type="button"
            aria-label={t('nav:sidebar.toggleDarkMode')}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="text-fg-3 hover:bg-surface-3 hover:text-foreground flex w-full items-center gap-2.5 rounded-[9px] px-[9px] py-2 text-[13px] transition-colors"
          >
            {isDark ? <Sun className="size-[17px] shrink-0" /> : <Moon className="size-[17px] shrink-0" />}
            {expanded && <span>{isDark ? t('nav:sidebar.lightMode') : t('nav:sidebar.darkMode')}</span>}
          </button>
          <button
            type="button"
            aria-label={t('nav:sidebar.toggle')}
            onClick={toggleSidebar}
            className="text-fg-3 hover:bg-surface-3 hover:text-foreground flex w-full items-center gap-2.5 rounded-[9px] px-[9px] py-2 text-[13px] transition-colors"
          >
            {collapsed ? <PanelLeftOpen className="size-[17px] shrink-0" /> : <PanelLeftClose className="size-[17px] shrink-0" />}
            {expanded && <span>{t('nav:sidebar.collapse')}</span>}
          </button>
          <div className="hover:bg-surface-3 mt-0.5 flex items-center gap-2.5 rounded-[9px] px-[9px] py-2 transition-colors">
            <span className="bg-tint text-primary flex size-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
              DR
            </span>
            {expanded && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold">Diego Rivas</span>
                <span className="text-fg-4 block text-[11px]">{t('nav:sidebar.userRole', { organization: 'Sunstate Car Co.' })}</span>
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
