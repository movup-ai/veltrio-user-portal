import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { bookingKeys } from '@/modules/bookings/hooks/use-bookings'
import { paymentKeys } from '@/modules/payments/hooks/use-payments'
import { vehicleKeys } from '@/modules/vehicles/hooks/use-vehicles'
import { DASHBOARD_REFRESH_MS } from '../constants/dashboard.constants'

/**
 * Re-reads the dashboard's figures on a timer and when the tab regains focus. The counter leaves
 * this page open all day, and window-focus refetching is off app-wide. Returns the time of the
 * last refresh, so "today" moves on at midnight with the figures.
 */
export function useDashboardRefresh(): number {
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      setNow(Date.now())
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      void queryClient.invalidateQueries({ queryKey: paymentKeys.stats })
      void queryClient.invalidateQueries({ queryKey: paymentKeys.allCollected })
      void queryClient.invalidateQueries({ queryKey: [...vehicleKeys.all, 'stats'] })
    }
    const timer = window.setInterval(refresh, DASHBOARD_REFRESH_MS)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [queryClient])

  return now
}
