import { useLocation } from 'react-router-dom'
import { Bell, Menu, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePageActionsStore } from '@/state/page-actions.store'
import { navLabelForPath } from './nav-items'

export function Header({ onMobileMenuClick }: { onMobileMenuClick: () => void }) {
  const location = useLocation()
  const title = navLabelForPath(location.pathname)
  const headerActions = usePageActionsStore((state) => state.headerActions)
  const breadcrumbExtra = usePageActionsStore((state) => state.breadcrumbExtra)

  return (
    <header className="bg-header border-border sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-3.5 border-b py-0 pr-5 pl-4 backdrop-blur-lg lg:pl-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMobileMenuClick} aria-label="Open menu">
        <Menu />
      </Button>

      <nav aria-label="Breadcrumb" className="text-fg-4 hidden shrink-0 items-center gap-[7px] text-[13px] whitespace-nowrap sm:flex">
        <span>Sunstate Car Co.</span>
        <span>/</span>
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

      <label className="bg-surface border-border focus-within:border-primary flex h-[34px] min-w-0 max-w-[300px] flex-[1_1_160px] items-center gap-2 rounded-[9px] border px-2.5 focus-within:shadow-[0_0_0_3px_var(--color-tint)]">
        <Search className="text-fg-4 size-[15px] shrink-0" />
        <input
          type="text"
          placeholder="Search plate, booking, customer"
          aria-label="Global search"
          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-foreground outline-none"
        />
        <kbd className="text-fg-4 border-border hidden shrink-0 rounded-[5px] border px-1 py-px font-mono text-[10.5px] sm:block">⌘K</kbd>
      </label>

      <button
        type="button"
        aria-label="Notifications, 3 unread"
        className="bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground relative flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border transition-colors"
      >
        <Bell className="size-4" />
        <span className="bg-error border-background text-surface absolute -top-[3px] -right-[3px] flex size-[15px] items-center justify-center rounded-full border-2 text-[9.5px] font-bold">
          3
        </span>
      </button>

      {headerActions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className="bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover flex h-[34px] shrink-0 items-center gap-[7px] rounded-[9px] px-3 text-[13px] font-semibold whitespace-nowrap transition-colors"
        >
          <a.icon className="size-[15px]" strokeWidth={2.5} />
          <span className="hidden sm:inline">{a.label}</span>
        </button>
      ))}
    </header>
  )
}
