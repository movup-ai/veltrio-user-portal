import { useMutation } from '@tanstack/react-query'
import { toast } from '@/components/ui/use-toast'
import { normalizeApiError } from '@/services/api/errors'

const REVOKE_AFTER_MS = 60_000

interface PdfOpenerOptions {
  /** The file name used when no tab handle came back and the PDF is saved instead. */
  fallbackName: string
  /** Read when the fetch fails, so the toast follows the language in effect. */
  errorTitle: () => string
}

/**
 * Opens a fetched PDF in a new tab. A mutation rather than a query: it is an action someone
 * takes, and the blob is not worth caching.
 *
 * Call `open` straight from the click: the tab opens there, before the mutation's own awaits,
 * since some browsers block a tab opened a tick after the click. The object URL is revoked on
 * a timer rather than immediately - revoking it synchronously can race the new tab.
 */
export function usePdfOpener<TArg = void>(
  fetchPdf: (arg: TArg) => Promise<Blob>,
  { fallbackName, errorTitle }: PdfOpenerOptions,
) {
  const mutation = useMutation({
    mutationFn: async ({ arg, tab }: { arg: TArg; tab: Window | null }) => {
      try {
        const pdf = await fetchPdf(arg)
        const url = URL.createObjectURL(pdf)
        if (tab) {
          // Severed here rather than by `noopener` above, which costs us the handle.
          tab.opener = null
          tab.location.href = url
        } else {
          const link = document.createElement('a')
          link.href = url
          link.download = fallbackName
          link.click()
        }
        setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS)
      } catch (error) {
        tab?.close()
        throw error
      }
    },
    onError: (error) => {
      toast({
        title: errorTitle(),
        description: normalizeApiError(error).message,
        variant: 'error',
      })
    },
  })

  return {
    open: (arg: TArg) => mutation.mutate({ arg, tab: window.open('', '_blank') }),
    isPending: mutation.isPending,
  }
}
