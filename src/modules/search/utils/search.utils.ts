import type { Matches, SearchGroup, SearchHit, SearchPage, SearchResults } from '../types/search.types'

/** Fewer letters match most of the book and say nothing; two is where results start to mean something. */
export const MIN_TERM_LENGTH = 2
/** Per group: enough to spot the one meant, few enough that the list never scrolls far. */
export const RESULTS_PER_GROUP = 5

/** The term to search for, or none while it is too short to send. */
export function searchTerm(raw: string): string | undefined {
  const term = raw.trim()
  return term.length >= MIN_TERM_LENGTH ? term : undefined
}

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Pages whose name contains the term, accents aside: "pag" finds "Pagos". All of them with none. */
export function matchingPages(raw: string, pages: SearchPage[]): SearchPage[] {
  const term = fold(raw.trim())
  return term ? pages.filter((page) => fold(page.label).includes(term)) : pages
}

/** Where a group's "see all" row goes: the list itself, opened on the same search. */
export function listLink(path: string, term: string): string {
  return `${path}?search=${encodeURIComponent(term)}`
}

type ListGroup = Exclude<SearchGroup, 'pages'>

interface HitWords {
  seeAll: (group: ListGroup, count: number) => string
}

/** Every row in the order shown and walked by the arrow keys: pages first, then each list. */
export function toHits(
  term: string | undefined,
  pages: SearchPage[],
  results: Partial<SearchResults>,
  words: HitWords,
): SearchHit[] {
  const hits: SearchHit[] = pages.map((page) => ({
    id: `page:${page.to}`,
    group: 'pages',
    to: page.to,
    title: page.label,
    icon: page.icon,
  }))
  if (!term) return hits

  return [
    ...hits,
    ...section('bookings', '/bookings', term, results.bookings, words, (booking) => ({
      id: `booking:${booking.id}`,
      to: `/bookings/${encodeURIComponent(booking.reference)}`,
      title: `${booking.reference} · ${booking.customer.name}`,
      detail: [booking.vehicleName, booking.vehiclePlate].filter(Boolean).join(' · '),
    })),
    ...section('vehicles', '/vehicles', term, results.vehicles, words, (vehicle) => ({
      id: `vehicle:${vehicle.id}`,
      to: `/vehicles/${vehicle.id}`,
      title: `${vehicle.make} ${vehicle.model} ${vehicle.year}`,
      detail: [vehicle.plate, vehicle.location].filter(Boolean).join(' · '),
    })),
    ...section('customers', '/customers', term, results.customers, words, (customer) => ({
      id: `customer:${customer.id}`,
      to: `/customers/${customer.id}`,
      title: customer.name,
      detail: customer.email,
    })),
  ]
}

/** One list's rows, then a row opening the whole list when it holds more than are shown. */
function section<T>(
  group: ListGroup,
  path: string,
  term: string,
  matches: Matches<T> | undefined,
  words: HitWords,
  toHit: (item: T) => Omit<SearchHit, 'group'>,
): SearchHit[] {
  if (!matches) return []
  const rows: SearchHit[] = matches.items.map((item) => ({ ...toHit(item), group }))
  if (matches.total > matches.items.length) {
    rows.push({
      id: `all:${group}`,
      group,
      to: listLink(path, term),
      title: words.seeAll(group, matches.total),
      seeAll: true,
    })
  }
  return rows
}

/** The next row with the arrow keys, wrapping at either end. */
export function moveActive(index: number, step: 1 | -1, count: number): number {
  if (count === 0) return -1
  return (index + step + count) % count
}

/** Ctrl+K, or ⌘K on a Mac: the shortcut the header names. */
export function isSearchShortcut(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey'>,
): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k'
}

/** "⌘K" on a Mac, "Ctrl K" elsewhere: naming the key a Windows user does not have is no hint. */
export function shortcutLabel(platform: string): string {
  return /mac|iphone|ipad/i.test(platform) ? '⌘K' : 'Ctrl K'
}
