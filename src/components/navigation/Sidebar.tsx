import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CarFront,
  ChevronsUpDown,
  ListChecks,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  UserCog,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePermissions } from '@/components/feedback/Can'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/state/ui.store'
import type { MembershipRole } from '@/types/user'
import { initials } from '@/utils/formatting'
import { NAV_ITEMS, type NavLinkKey } from './nav-items'

export interface SidebarAccount {
  name: string
  role: MembershipRole
  organization: string
  onOpenProfile: () => void
  onSignOut: () => void
}

interface SidebarProps {
  /** Renders as an overlay drawer on mobile; hidden until opened. */
  mobileOpen?: boolean
  onMobileClose?: () => void
  /** Live counts beside a link, such as reservations waiting for an answer. */
  badges?: Partial<Record<NavLinkKey, string>>
  /** Who is signed in; the card is left out until it is known. */
  account?: SidebarAccount
  /** Brings back a getting-started checklist that was put away before it was finished. */
  setup?: { done: number; total: number; onOpen: () => void }
}

export function Sidebar({ mobileOpen = false, onMobileClose, badges, account, setup }: SidebarProps) {
  const { t } = useTranslation(['nav', 'common'])
  // Tailwind's `lg`: below it the sidebar is the 242px drawer, which has no collapsed form.
  const desktop = useMediaQuery('(min-width: 64rem)')
  const collapsed = useUIStore((state) => state.sidebarCollapsed) && desktop
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const theme = useUIStore((state) => state.theme)
  const setTheme = useUIStore((state) => state.setTheme)
  const permissions = usePermissions()
  const expanded = !collapsed

  useEffect(() => {
    if (!mobileOpen || !onMobileClose) return
    const close = (event: KeyboardEvent) => {
      // Radix marks the Escape that closes a menu inside the drawer, so that one leaves it open.
      if (event.key === 'Escape' && !event.defaultPrevented) onMobileClose()
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [mobileOpen, onMobileClose])

  const isDark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onMobileClose} aria-hidden />
      )}

      <aside
        // Off-screen is not gone: without this a closed drawer's links stay in the Tab order.
        inert={!desktop && !mobileOpen}
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

        <nav
          className="vx-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-3"
          aria-label={t('nav:sidebar.primary')}
        >
          {NAV_ITEMS.map((item) => {
            if (item.type === 'group') {
              return expanded ? (
                <div
                  key={item.key}
                  className="text-fg-4 px-[9px] pt-3.5 pb-1.5 text-[10.5px] font-semibold tracking-wider uppercase"
                >
                  {t(`nav:groups.${item.key}`)}
                </div>
              ) : null
            }

            if (item.permission && !permissions.includes(item.permission)) return null
            const badge = badges?.[item.key]
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
                {expanded && (
                  <span className="flex-1 overflow-hidden whitespace-nowrap">
                    {t(`nav:links.${item.key}`)}
                  </span>
                )}
                {badge && expanded && (
                  <span className="bg-surface-3 text-fg-3 min-w-5 shrink-0 rounded-full px-1.5 py-px text-center font-mono text-[11px] font-semibold">
                    {badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-border-soft border-t px-3 py-2.5">
          {setup && (
            <button
              type="button"
              aria-label={t('nav:sidebar.setup.open', { done: setup.done, total: setup.total })}
              onClick={setup.onOpen}
              className="text-fg-3 hover:bg-surface-3 hover:text-foreground flex w-full items-center gap-2.5 rounded-[9px] px-[9px] py-2 text-[13px] transition-colors"
            >
              <ListChecks className="size-[17px] shrink-0" />
              {expanded && (
                <>
                  <span className="flex-1 text-left">{t('nav:sidebar.setup.label')}</span>
                  <span className="text-fg-4 text-[11.5px] tabular-nums">
                    {t('nav:sidebar.setup.progress', { done: setup.done, total: setup.total })}
                  </span>
                </>
              )}
            </button>
          )}
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
            className="text-fg-3 hover:bg-surface-3 hover:text-foreground hidden w-full items-center gap-2.5 rounded-[9px] px-[9px] py-2 text-[13px] transition-colors lg:flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[17px] shrink-0" />
            ) : (
              <PanelLeftClose className="size-[17px] shrink-0" />
            )}
            {expanded && <span>{t('nav:sidebar.collapse')}</span>}
          </button>
          {account && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t('nav:sidebar.accountMenu')}
                className={cn(
                  'hover:bg-surface-3 data-[state=open]:bg-surface-3 mt-0.5 flex w-full items-center gap-2.5 rounded-[9px] px-[9px] py-2 text-left transition-colors',
                  collapsed && 'lg:justify-center lg:px-2',
                )}
              >
                <span className="bg-tint text-primary flex size-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                  {initials(account.name)}
                </span>
                {expanded && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold">{account.name}</span>
                      <span className="text-fg-4 block truncate text-[11px]">
                        {t('nav:sidebar.userRole', {
                          role: t(`nav:sidebar.roles.${account.role}`),
                          organization: account.organization,
                        })}
                      </span>
                    </span>
                    <ChevronsUpDown className="text-fg-4 size-4 shrink-0" aria-hidden />
                  </>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-[218px]">
                <DropdownMenuItem onSelect={account.onOpenProfile}>
                  <UserCog className="size-4" aria-hidden />
                  {t('nav:sidebar.profile')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={account.onSignOut}>
                  <LogOut className="size-4" aria-hidden />
                  {t('nav:sidebar.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>
    </>
  )
}
