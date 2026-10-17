import { useEffect, useId, useMemo, useState } from 'react'
import { ArrowRight, Car, CalendarCheck, Loader2, Search, Users, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '@/components/feedback/Can'
import { NAV_ITEMS } from '@/components/navigation/nav-items'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useGlobalSearch } from '../hooks/use-global-search'
import type { SearchGroup, SearchHit, SearchPage } from '../types/search.types'
import { isSearchShortcut, matchingPages, moveActive, shortcutLabel, toHits } from '../utils/search.utils'

const GROUP_ICONS: Record<Exclude<SearchGroup, 'pages'>, LucideIcon> = {
  bookings: CalendarCheck,
  vehicles: Car,
  customers: Users,
}
const GROUP_ORDER: SearchGroup[] = ['pages', 'bookings', 'vehicles', 'customers']

/** The header's search: the field opens it, and so do Ctrl+K and ⌘K from anywhere. */
export function GlobalSearch() {
  const { t } = useTranslation('nav')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) return
      // Taken from the browser, which would otherwise focus its own address bar.
      event.preventDefault()
      setOpen(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('header.globalSearch')}
        aria-haspopup="dialog"
        className="bg-surface border-border hover:border-border-strong focus-visible:outline-ring flex h-[34px] min-w-0 max-w-[300px] flex-[1_1_160px] items-center gap-2 rounded-[9px] border px-2.5 text-left transition-colors focus-visible:outline-2"
      >
        <Search className="text-fg-4 size-[15px] shrink-0" aria-hidden />
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-[13px]">
          {t('header.searchPlaceholder')}
        </span>
        <kbd className="text-fg-4 border-border hidden shrink-0 rounded-[5px] border px-1 py-px font-mono text-[10.5px] sm:block">
          {shortcutLabel(navigator.platform)}
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Mounted only while open, so each search starts empty. */}
        {open && <SearchPanel onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  )
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('search')
  const { t: tNav } = useTranslation('nav')
  const navigate = useNavigate()
  const permissions = usePermissions()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string>()
  const { term, results, searching, failed } = useGlobalSearch(query)

  const pages = useMemo<SearchPage[]>(
    () =>
      NAV_ITEMS.flatMap((item) =>
        item.type === 'link' && (!item.permission || permissions.includes(item.permission))
          ? [{ label: tNav(`links.${item.key}`), to: item.to, icon: item.icon }]
          : [],
      ),
    [permissions, tNav],
  )
  const hits = toHits(term, matchingPages(query, pages), results, {
    seeAll: (group, count) => t(`seeAll.${group}`, { count }),
  })
  // The first row is the one Enter opens until the arrow keys pick another.
  const active = hits.find((hit) => hit.id === activeId) ?? hits[0]
  const optionId = (hit: SearchHit) => `${listId}-${hit.id}`
  const tooShort = query.trim().length > 0 && !term
  const nothing = Boolean(term) && !searching && !failed && hits.every((hit) => hit.group === 'pages')

  const go = (hit: SearchHit) => {
    navigate(hit.to)
    onClose()
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const index = moveActive(
        active ? hits.indexOf(active) : -1,
        event.key === 'ArrowDown' ? 1 : -1,
        hits.length,
      )
      setActiveId(hits[index]?.id)
    } else if (event.key === 'Enter' && active) {
      event.preventDefault()
      go(active)
    }
  }

  return (
    <DialogContent
      aria-describedby={undefined}
      className="top-[12vh] w-[calc(100%-24px)] max-w-[620px] translate-y-0 gap-0 overflow-hidden p-0 data-[state=open]:animate-fade-in"
    >
      <DialogTitle className="sr-only">{t('title')}</DialogTitle>
      <div className="border-border-soft flex items-center gap-2.5 border-b py-3 pr-12 pl-4">
        <Search className="text-fg-4 size-4 shrink-0" aria-hidden />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={active ? optionId(active) : undefined}
          aria-autocomplete="list"
          aria-label={t('title')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveId(undefined)
          }}
          onKeyDown={onKeyDown}
          placeholder={t('placeholder')}
          className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent text-[14px] outline-none"
        />
        {searching && (
          <Loader2 className="text-fg-4 size-4 shrink-0 animate-spin" aria-label={t('searching')} />
        )}
      </div>

      <div
        id={listId}
        role="listbox"
        aria-label={t('title')}
        className="vx-scroll max-h-[min(440px,60vh)] overflow-y-auto p-2"
      >
        {GROUP_ORDER.map((group) => {
          const rows = hits.filter((hit) => hit.group === group)
          if (rows.length === 0) return null
          return (
            <div key={group} role="group" aria-labelledby={`${listId}-${group}`} className="pb-1">
              <div
                id={`${listId}-${group}`}
                className="text-fg-4 px-2.5 pt-2 pb-1 text-[10.5px] font-semibold tracking-wider uppercase"
              >
                {t(`groups.${group}`)}
              </div>
              {rows.map((hit) => {
                const Icon = hit.seeAll
                  ? ArrowRight
                  : (hit.icon ?? GROUP_ICONS[group as keyof typeof GROUP_ICONS])
                const selected = hit === active
                return (
                  <div
                    key={hit.id}
                    id={optionId(hit)}
                    role="option"
                    aria-selected={selected}
                    onMouseMove={() => setActiveId(hit.id)}
                    onClick={() => go(hit)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-[8px] px-2.5 py-2',
                      selected ? 'bg-surface-3' : 'hover:bg-surface-2',
                    )}
                  >
                    <Icon
                      className={cn('size-4 shrink-0', hit.seeAll ? 'text-primary' : 'text-fg-4')}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-[13.5px]',
                          hit.seeAll ? 'text-primary font-semibold' : 'text-foreground font-medium',
                        )}
                      >
                        {hit.title}
                      </span>
                      {hit.detail && (
                        <span className="text-fg-4 block truncate text-[12px]">{hit.detail}</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}

        {(tooShort || nothing || failed) && (
          <p role="status" className="text-fg-3 m-0 px-2.5 py-6 text-center text-[13px]">
            {failed ? t('failed') : tooShort ? t('tooShort') : t('nothing', { term })}
          </p>
        )}
      </div>

      <div className="border-border-soft bg-surface-2 text-fg-4 flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-2 text-[11.5px]">
        <span>
          <kbd className="font-mono">↑ ↓</kbd> {t('keys.move')}
        </span>
        <span>
          <kbd className="font-mono">↵</kbd> {t('keys.open')}
        </span>
        <span>
          <kbd className="font-mono">Esc</kbd> {t('keys.close')}
        </span>
      </div>
    </DialogContent>
  )
}
