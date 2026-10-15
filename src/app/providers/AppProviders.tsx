import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { reportError } from '@/lib/error-reporting'
import { isStaleMembership } from '@/services/auth/stale-membership'
import { ME_QUERY_KEY } from '@/services/auth/use-me'
import { I18nProvider } from './I18nProvider'
import { ThemeProvider } from './ThemeProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const onError = (error: unknown) => {
      // A failed request is shown on screen, so it never goes uncaught: reported from here instead.
      reportError(error)
      // Re-read the account, so the gate and the permissions catch up with a role change or removal.
      if (isStaleMembership(error)) void client.invalidateQueries({ queryKey: ME_QUERY_KEY })
    }
    const client: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    })
    return client
  })

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}
