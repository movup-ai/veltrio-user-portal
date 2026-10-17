import type { LucideIcon } from 'lucide-react'
import type { Booking } from '@/modules/bookings/types/booking.types'
import type { Customer } from '@/modules/customers/types/customer.types'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'

export type SearchGroup = 'pages' | 'bookings' | 'vehicles' | 'customers'

export interface Matches<T> {
  items: T[]
  total: number
}

export interface SearchResults {
  bookings: Matches<Booking>
  vehicles: Matches<Vehicle>
  customers: Matches<Customer>
}

/** One row of the results, in the order the keyboard walks them. */
export interface SearchHit {
  id: string
  group: SearchGroup
  /** Where choosing it goes. */
  to: string
  title: string
  detail?: string
  icon?: LucideIcon
  /** The last row of a group, opening the whole list filtered by the search. */
  seeAll?: boolean
}

export interface SearchPage {
  label: string
  to: string
  icon: LucideIcon
}
