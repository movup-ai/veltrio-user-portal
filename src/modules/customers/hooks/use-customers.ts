import { keepPreviousData, useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'
import { customerApi } from '../api/customer.api'
import {
  customerDocumentApi,
  uploadCustomerDocument,
  uploadCustomerDocuments,
} from '../api/customer-document.api'
import { toCustomerConflict } from '../api/customer.mapper'
import type {
  CustomerListParams,
  CustomerMatchInput,
  CustomerProfileInput,
  DocumentKind,
} from '../types/customer.types'
import { hasEnoughToMatch } from '../utils/customer.matching'

export const customerKeys = {
  all: ['customers'] as const,
  search: (search: string) => [...customerKeys.all, 'search', search] as const,
  documents: (customerId: string) => [...customerKeys.all, customerId, 'documents'] as const,
  page: (params: CustomerListParams) => [...customerKeys.all, 'page', params] as const,
  stats: () => [...customerKeys.all, 'stats'] as const,
  detail: (customerId: string) => [...customerKeys.all, customerId, 'detail'] as const,
  matches: (input: CustomerMatchInput) => [...customerKeys.all, 'matches', input] as const,
}

/** One page of the customer book. The rows on screen stay while the next page loads. */
export function useCustomerPage(params: CustomerListParams) {
  const query = useQuery({
    queryKey: customerKeys.page(params),
    queryFn: () => customerApi.page(params),
    placeholderData: keepPreviousData,
  })
  return { ...query, isStale: query.isPlaceholderData }
}

export function useCustomerStats() {
  return useQuery({ queryKey: customerKeys.stats(), queryFn: () => customerApi.stats() })
}

export function useCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(customerId ?? ''),
    queryFn: () => customerApi.get(customerId as string),
    enabled: Boolean(customerId),
  })
}

/**
 * Who on file a renter being typed in might already be. Idle until there is something
 * identifying to ask about, so an empty form does not send a request that can only be empty.
 */
export function useCustomerMatches(input: CustomerMatchInput) {
  return useQuery({
    queryKey: customerKeys.matches(input),
    queryFn: () => customerApi.match(input),
    enabled: hasEnoughToMatch(input),
    placeholderData: keepPreviousData,
  })
}

interface SaveArgs {
  /** Absent when adding. */
  id?: string
  input: CustomerProfileInput
  allowSharedLicence?: boolean
  /** Scans picked in the form, sent once the customer has an id to attach them to. */
  documents?: Partial<Record<DocumentKind, File>>
}

/**
 * Adds or edits a customer. A refusal that names a customer already on file is left to the
 * caller: it is a question to put to the counter, not a failure to report.
 */
export function useSaveCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input, allowSharedLicence, documents = {} }: SaveArgs) => {
      const customer = id
        ? await customerApi.update(id, input, { allowSharedLicence })
        : await customerApi.add(input, { allowSharedLicence })
      return { customer, failed: await uploadCustomerDocuments(customer.id, documents) }
    },
    onSuccess: ({ failed }, { id }) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all })
      // A booking shows its renter's details, which an edit has just changed.
      if (id) void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast({
        title: i18n.t(id ? 'customers:toast.updated' : 'customers:toast.added'),
        variant: 'success',
      })
      if (failed.length > 0) {
        toast({
          title: i18n.t('customers:toast.documentUploadFailed'),
          description: i18n.t('customers:toast.documentsNotUploaded', {
            documents: failed.map((kind) => i18n.t(`customers:documents.kind.${kind}`)).join(', '),
          }),
          variant: 'error',
        })
      }
    },
    onError: (error, { id }) => {
      if (toCustomerConflict(error)) return
      toast({
        title: i18n.t(id ? 'customers:toast.updateFailed' : 'customers:toast.addFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
}

const documentUploadKey = (customerId: string) =>
  [...customerKeys.all, customerId, 'documents', 'upload'] as const

interface DocumentUpload {
  kind: DocumentKind
  file: File
}

/**
 * Whether a scan of this kind is on its way up for this customer. Asked of the client, not
 * of the hook that started it: the slot showing an upload can be unmounted and remade while
 * the file is still going (a failed refresh, then a retry), and a new slot must still know.
 */
export function useIsUploadingCustomerDocument(customerId: string, kind: DocumentKind): boolean {
  const inFlight = useIsMutating({
    mutationKey: documentUploadKey(customerId),
    predicate: (mutation) => (mutation.state.variables as DocumentUpload | undefined)?.kind === kind,
  })
  return inFlight > 0
}

/** Puts a scan on a customer's file, replacing the one of that kind already there. */
export function useUploadCustomerDocument(customerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: documentUploadKey(customerId),
    mutationFn: ({ kind, file }: DocumentUpload) => uploadCustomerDocument(customerId, kind, file),
    onSuccess: () => toast({ title: i18n.t('customers:toast.documentUploaded'), variant: 'success' }),
    onError: (error) => {
      toast({
        title: i18n.t('customers:toast.documentUploadFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
    // Either way: a failed upload can still have left the slot's row behind, and the list's
    // documents column reads from the same customer.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  })
}

export function useMergeCustomers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ targetId, sourceId }: { targetId: string; sourceId: string }) =>
      customerApi.merge(targetId, sourceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all })
      // The merged customer's bookings now belong to the one kept.
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast({ title: i18n.t('customers:toast.merged'), variant: 'success' })
    },
    onError: (error) => {
      toast({
        title: i18n.t('customers:toast.mergeFailed'),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })
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
