import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { reportError } from '@/lib/error-reporting'
import { I18nProvider } from './I18nProvider'
import { ThemeProvider } from './ThemeProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // A failed request is shown on screen, so it never goes uncaught: reported from here instead.
        queryCache: new QueryCache({ onError: reportError }),
        mutationCache: new MutationCache({ onError: reportError }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

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
