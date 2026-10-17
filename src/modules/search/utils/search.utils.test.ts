import { CalendarCheck } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import type { Booking } from '@/modules/bookings/types/booking.types'
import type { Customer } from '@/modules/customers/types/customer.types'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import type { SearchPage } from '../types/search.types'
import {
  isSearchShortcut,
  listLink,
  matchingPages,
  moveActive,
  searchTerm,
  shortcutLabel,
  toHits,
} from './search.utils'

const PAGES: SearchPage[] = [
  { label: 'Reservas', to: '/bookings', icon: CalendarCheck },
  { label: 'Pagos', to: '/payments', icon: CalendarCheck },
  { label: 'Vehículos', to: '/vehicles', icon: CalendarCheck },
]

const booking = {
  id: 'b-1',
  reference: 'BK-10002',
  customer: { name: 'Kevin Ragira' },
  vehicleName: 'Honda Accord',
  vehiclePlate: 'ABC123',
} as Booking
const vehicle = {
  id: 'v-1',
  make: 'Honda',
  model: 'Accord',
  year: 2023,
  plate: 'ABC123',
  location: 'Downtown',
} as Vehicle
const customer = { id: 'c-1', name: 'Kevin Ragira', email: 'kevin@example.com' } as Customer
const words = { seeAll: (group: string, count: number) => `all ${count} ${group}` }

describe('searchTerm', () => {
  it('waits for two letters, ignoring spaces', () => {
    expect(searchTerm(' k ')).toBeUndefined()
    expect(searchTerm(' ke ')).toBe('ke')
  })
})

describe('matchingPages', () => {
  it('finds a page by part of its name, accents aside', () => {
    expect(matchingPages('vehiculo', PAGES).map((page) => page.to)).toEqual(['/vehicles'])
    expect(matchingPages('PAG', PAGES).map((page) => page.to)).toEqual(['/payments'])
  })

  it('offers every page before anything is typed', () => {
    expect(matchingPages('  ', PAGES)).toHaveLength(3)
  })
})

describe('toHits', () => {
  it('lists pages only until there is a term to search with', () => {
    expect(toHits(undefined, PAGES.slice(0, 1), { bookings: { items: [booking], total: 1 } }, words)).toEqual(
      [expect.objectContaining({ group: 'pages', to: '/bookings' })],
    )
  })

  it('walks pages, then bookings, vehicles and customers, each opening its own page', () => {
    const hits = toHits(
      'kevin',
      [],
      {
        bookings: { items: [booking], total: 1 },
        vehicles: { items: [vehicle], total: 1 },
        customers: { items: [customer], total: 1 },
      },
      words,
    )

    expect(hits.map((hit) => [hit.group, hit.to, hit.title, hit.detail])).toEqual([
      ['bookings', '/bookings/BK-10002', 'BK-10002 · Kevin Ragira', 'Honda Accord · ABC123'],
      ['vehicles', '/vehicles/v-1', 'Honda Accord 2023', 'ABC123 · Downtown'],
      ['customers', '/customers/c-1', 'Kevin Ragira', 'kevin@example.com'],
    ])
  })

  it('ends a group with its whole list when it holds more than are shown', () => {
    const hits = toHits('kev in', [], { bookings: { items: [booking], total: 12 } }, words)

    expect(hits.at(-1)).toMatchObject({
      seeAll: true,
      to: '/bookings?search=kev%20in',
      title: 'all 12 bookings',
    })
  })
})

describe('keys', () => {
  it('wraps the arrow keys at either end', () => {
    expect(moveActive(2, 1, 3)).toBe(0)
    expect(moveActive(0, -1, 3)).toBe(2)
    expect(moveActive(-1, 1, 3)).toBe(0)
    expect(moveActive(0, 1, 0)).toBe(-1)
  })

  it('opens on Ctrl+K and ⌘K, not on K alone or with Alt', () => {
    const key = { key: 'k', metaKey: false, ctrlKey: false, altKey: false }
    expect(isSearchShortcut({ ...key, ctrlKey: true })).toBe(true)
    expect(isSearchShortcut({ ...key, metaKey: true, key: 'K' })).toBe(true)
    expect(isSearchShortcut(key)).toBe(false)
    expect(isSearchShortcut({ ...key, ctrlKey: true, altKey: true })).toBe(false)
  })

  it('names the key the computer has', () => {
    expect(shortcutLabel('MacIntel')).toBe('⌘K')
    expect(shortcutLabel('Win32')).toBe('Ctrl K')
  })

  it('opens a list on the search, safely encoded', () => {
    expect(listLink('/customers', 'ana & co')).toBe('/customers?search=ana%20%26%20co')
  })
})
