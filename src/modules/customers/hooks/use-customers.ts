import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { customerApi } from '../api/customer.api'
import { customerDocumentApi } from '../api/customer-document.api'

export const customerKeys = {
  all: ['customers'] as const,
  search: (search: string) => [...customerKeys.all, 'search', search] as const,
  documents: (customerId: string) => [...customerKeys.all, customerId, 'documents'] as const,
}

/**
 * Matches for a lookup box. The previous results stay on screen while the next keystroke's
 * query is in flight, so the dropdown doesn't blink empty between letters.
 */
export function useCustomerSearch(search: string) {
  return useQuery({
    queryKey: customerKeys.search(search.trim()),
    queryFn: () => customerApi.search(search.trim()),
    placeholderData: keepPreviousData,
  })
}

/**
 * The scans already on file for a renter. Metadata only — the files themselves need a signed
 * link each time, so nothing here grants access to the bytes.
 *
 * Disabled until a customer is actually chosen: a booking for a new renter has no id to ask
 * about, and querying with a blank one would be a request that can only 404.
 */
export function useCustomerDocuments(customerId: string | undefined) {
  return useQuery({
    queryKey: customerKeys.documents(customerId ?? ''),
    queryFn: () => customerDocumentApi.list(customerId as string),
    enabled: Boolean(customerId),
  })
}
