import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDebounced } from '@/lib/use-debounced'
import { searchApi } from '../api/search.api'
import type { SearchResults } from '../types/search.types'
import { RESULTS_PER_GROUP, searchTerm } from '../utils/search.utils'

export const searchKeys = {
  group: (group: keyof SearchResults, term: string) => ['global-search', group, term] as const,
}

// Shorter than the lists' own delay: here each keystroke is waited on, not a table behind it.
const TYPING_DELAY_MS = 200

/** The three lists searched at once; each group shows as soon as it answers. */
export function useGlobalSearch(raw: string) {
  const term = searchTerm(useDebounced(raw, TYPING_DELAY_MS))
  const options = { enabled: Boolean(term), placeholderData: keepPreviousData, staleTime: 30_000 }

  const bookings = useQuery({
    queryKey: searchKeys.group('bookings', term ?? ''),
    queryFn: () => searchApi.bookings(term ?? '', RESULTS_PER_GROUP),
    ...options,
  })
  const vehicles = useQuery({
    queryKey: searchKeys.group('vehicles', term ?? ''),
    queryFn: () => searchApi.vehicles(term ?? '', RESULTS_PER_GROUP),
    ...options,
  })
  const customers = useQuery({
    queryKey: searchKeys.group('customers', term ?? ''),
    queryFn: () => searchApi.customers(term ?? '', RESULTS_PER_GROUP),
    ...options,
  })

  const queries = [bookings, vehicles, customers]
  return {
    term,
    results: { bookings: bookings.data, vehicles: vehicles.data, customers: customers.data },
    searching: Boolean(term) && queries.some((query) => query.isFetching),
    failed: Boolean(term) && queries.every((query) => query.isError),
  }
}
