import { useEffect } from 'react'
import { usePageActionsStore, type HeaderAction } from '@/state/page-actions.store'

/** Registers this page's primary action(s) in the sticky Header for the duration it's mounted. */
export function usePageHeaderActions(actions: HeaderAction[]) {
  const setHeaderActions = usePageActionsStore((state) => state.setHeaderActions)

  useEffect(() => {
    setHeaderActions(actions)
    return () => setHeaderActions([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
