import { apiClient } from '@/services/api/client'
import { toCustomer, type CustomerWire } from './customer.mapper'

/**
 * The customer book's lookup endpoint. Only search exists so far — the customers page is still
 * mock-backed, and its list, filters and stats will land with their own endpoints.
 */
export const customerApi = {
  /** At most 20 matches on name, email or licence number, by name. */
  search: (search: string) =>
    apiClient
      .get<CustomerWire[]>('/customers', { params: { search } })
      .then((r) => r.data.map(toCustomer)),
}
