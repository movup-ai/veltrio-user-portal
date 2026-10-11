import { apiClient } from '@/services/api/client'
import { MAX_CUSTOMER_PAGES, fetchEveryPage, toPaginatedResult, type ListEnvelope } from '@/lib/pagination'
import type {
  CustomerProfileInput,
  CustomerListParams,
  CustomerMatchInput,
  CustomerStats,
} from '../types/customer.types'
import {
  toCustomer,
  toCustomerDetail,
  toCustomerListQuery,
  toCustomerMatch,
  toCustomerMatchPayload,
  toCustomerProfilePayload,
  toCustomerRow,
  type CustomerDetailWire,
  type CustomerMatchWire,
  type CustomerRowWire,
  type CustomerWire,
} from './customer.mapper'

/** `allowSharedLicence`: the counter confirmed this is not the customer holding that licence. */
interface SaveOptions {
  allowSharedLicence?: boolean
}

export const customerApi = {
  /** At most 20 matches on name, email or licence number, by name. For a lookup box. */
  search: (search: string) =>
    apiClient.get<CustomerWire[]>('/customers', { params: { search } }).then((r) => r.data.map(toCustomer)),

  page: (params: CustomerListParams) =>
    apiClient
      .get<ListEnvelope<CustomerRowWire>>('/customers/book', { params: toCustomerListQuery(params) })
      .then((r) => toPaginatedResult(r.data.items.map(toCustomerRow), r.data.total, params)),

  /** Every customer matching the search, for the CSV: not just the page on screen. */
  exportAll: (params: Omit<CustomerListParams, 'page' | 'pageSize'>) =>
    fetchEveryPage((page) => customerApi.page({ ...params, ...page }), MAX_CUSTOMER_PAGES),

  stats: () => apiClient.get<CustomerStats>('/customers/stats').then((r) => r.data),

  get: (id: string) =>
    apiClient.get<CustomerDetailWire>(`/customers/${id}`).then((r) => toCustomerDetail(r.data)),

  /** A POST, not a GET: what is being matched is personal data, and URLs are logged. */
  match: (input: CustomerMatchInput) =>
    apiClient
      .post<CustomerMatchWire[]>('/customers/match', toCustomerMatchPayload(input))
      .then((r) => r.data.map(toCustomerMatch)),

  add: (input: CustomerProfileInput, options: SaveOptions = {}) =>
    apiClient
      .post<CustomerWire>('/customers', { customer: toCustomerProfilePayload(input), ...options })
      .then((r) => toCustomer(r.data)),

  update: (id: string, input: CustomerProfileInput, options: SaveOptions = {}) =>
    apiClient
      .put<CustomerWire>(`/customers/${id}`, { customer: toCustomerProfilePayload(input), ...options })
      .then((r) => toCustomer(r.data)),

  /** Folds `sourceId` into `targetId` and deletes it. Cannot be undone. */
  merge: (targetId: string, sourceId: string) =>
    apiClient
      .post<CustomerWire>(`/customers/${targetId}/merge`, { sourceId })
      .then((r) => toCustomer(r.data)),
}
