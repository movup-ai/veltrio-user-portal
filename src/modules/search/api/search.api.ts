import type { ListEnvelope } from '@/lib/pagination'
import { toBooking, type BookingWire } from '@/modules/bookings/api/booking.mapper'
import { toCustomerRow, type CustomerRowWire } from '@/modules/customers/api/customer.mapper'
import { toVehicle, type VehicleWire } from '@/modules/vehicles/api/vehicle.mapper'
import { apiClient } from '@/services/api/client'
import type { Booking } from '@/modules/bookings/types/booking.types'
import type { Customer } from '@/modules/customers/types/customer.types'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import type { Matches } from '../types/search.types'

/**
 * The header search, on the endpoints each list already searches with: the same fields, so a
 * match here is a match on the list it opens.
 */
export const searchApi = {
  bookings: (search: string, limit: number): Promise<Matches<Booking>> =>
    apiClient
      .get<ListEnvelope<BookingWire>>('/bookings', { params: { search, limit } })
      .then((r) => ({ items: r.data.items.map(toBooking), total: r.data.total })),

  vehicles: (search: string, limit: number): Promise<Matches<Vehicle>> =>
    apiClient
      .get<ListEnvelope<VehicleWire>>('/vehicles', { params: { search, limit } })
      .then((r) => ({ items: r.data.items.map(toVehicle), total: r.data.total })),

  // The customers page's own list, not the booking form's lookup: that one has no total.
  customers: (search: string, limit: number): Promise<Matches<Customer>> =>
    apiClient
      .get<ListEnvelope<CustomerRowWire>>('/customers/book', { params: { search, limit } })
      .then((r) => ({ items: r.data.items.map(toCustomerRow), total: r.data.total })),
}
