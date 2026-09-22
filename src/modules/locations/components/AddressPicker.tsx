import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, MapPin, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { AddressPin } from '../types/location.types'
import {
  newSessionToken,
  placesConfigured,
  resolvePlace,
  suggestPlaces,
  type PlaceSuggestion,
} from '../utils/places'

interface Props {
  /** The formatted one-line address. */
  value: string
  /**
   * Called with the address and, when it came from a suggestion, the parts behind it. Typing
   * by hand clears the parts: they would otherwise still point at the previous place.
   *
   * `picked` distinguishes the two. A caller that acts on a resolved place — rather than on
   * every keystroke — needs to know which of the two it is looking at.
   */
  onChange: (address: string, pin: AddressPin, picked: boolean) => void
  id?: string
  invalid?: boolean
  describedBy?: string
}

const EMPTY_PIN: AddressPin = {}
const DEBOUNCE_MS = 250

/**
 * Address lookup for a branch. Searching returns real places, so a saved branch has a
 * resolvable address and coordinates rather than whatever string somebody typed.
 *
 * Without a Maps key this is a plain text input: the field still works, it just cannot
 * suggest. That keeps the form usable in development and in CI.
 */
export function AddressPicker({ value, onChange, id, invalid, describedBy }: Props) {
  const { t } = useTranslation('locations')
  const listId = useId()

  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [active, setActive] = useState(-1)

  const session = useRef<Awaited<ReturnType<typeof newSessionToken>>>(undefined)
  const container = useRef<HTMLDivElement>(null)
  // Guards against a slow response overwriting the results of a newer keystroke.
  const latest = useRef(0)

  useEffect(() => {
    if (!placesConfigured || !open) return
    const term = query.trim()
    if (term === '') return

    const request = ++latest.current
    const timer = setTimeout(async () => {
      // Set here rather than in the effect body: the spinner belongs to the request, not to
      // the debounce window that precedes it.
      setSearching(true)
      try {
        session.current ??= await newSessionToken()
        const results = await suggestPlaces(term, session.current)
        // A newer keystroke owns the list now; leave its results alone.
        if (request !== latest.current) return
        setSuggestions(results)
        setActive(-1)
      } finally {
        // Always cleared, even for a superseded request: closing the menu mid-flight would
        // otherwise leave the spinner turning with nothing behind it.
        if (request === latest.current) setSearching(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const choose = async (suggestion: PlaceSuggestion) => {
    setOpen(false)
    setSuggestions([])
    // Shown immediately; the formatted address replaces it once the details come back.
    const provisional = `${suggestion.primary} ${suggestion.secondary}`.trim()
    setQuery(provisional)
    // Reported straight away as well. The input and the form must never disagree: leaving the
    // form on the half-typed search term would save an address nobody saw.
    onChange(provisional, EMPTY_PIN, false)

    const place = await resolvePlace(suggestion)
    // A session ends with its details lookup, so the next search starts a new one.
    session.current = undefined
    // Details failed. The chosen text stands, without the parts that would have described it.
    if (!place) return

    const { address, ...pin } = place
    setQuery(address)
    onChange(address, pin, true)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((index) => (index + step + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault()
      void choose(suggestions[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={container} className="relative">
      <div className="relative">
        {placesConfigured && (
          <Search className="text-fg-4 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        )}
        <Input
          id={id}
          value={query}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={cn(placesConfigured && 'pl-9')}
          placeholder={
            placesConfigured ? t('form.addressSearchPlaceholder') : t('form.addressPlaceholder')
          }
          autoComplete="off"
          role={placesConfigured ? 'combobox' : undefined}
          aria-expanded={placesConfigured ? open : undefined}
          aria-controls={placesConfigured ? listId : undefined}
          aria-autocomplete={placesConfigured ? 'list' : undefined}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onChange={(event) => {
            const next = event.target.value
            setQuery(next)
            setOpen(true)
            if (next.trim() === '') setSuggestions([])
            // Typed by hand: the old components no longer describe this address.
            onChange(next, EMPTY_PIN, false)
          }}
        />
        {searching && (
          <Loader2 className="text-fg-4 absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
        )}
      </div>

      {placesConfigured && open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="border-border bg-popover absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border p-1 shadow-md"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={cn(
                  'flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left transition-colors',
                  index === active ? 'bg-muted' : 'hover:bg-muted',
                )}
                // The input's blur would close the list before the click registered.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void choose(suggestion)}
              >
                <MapPin className="text-fg-4 mt-0.5 size-3.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">
                    {suggestion.primary}
                  </span>
                  {suggestion.secondary && (
                    <span className="text-fg-3 block truncate text-caption">
                      {suggestion.secondary}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
