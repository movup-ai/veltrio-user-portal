import { useEffect } from 'react'
import { usePageActionsStore, type HeaderAction } from '@/state/page-actions.store'

/**
 * Registers this page's primary action(s) in the sticky Header for the duration it's mounted.
 * Pass `deps` when the actions close over data that loads after mount (e.g. a record's id) so
 * the Header re-registers once real data is available — defaults to running once, like before.
 */
export function usePageHeaderActions(actions: HeaderAction[], deps: unknown[] = []) {
  const setHeaderActions = usePageActionsStore((state) => state.setHeaderActions)

  useEffect(() => {
    setHeaderActions(actions)
    return () => setHeaderActions([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
