import { useEffect } from 'react'
import { usePageActionsStore } from '@/state/page-actions.store'

/** Registers a dynamic third breadcrumb segment (e.g. a record's name) for the duration this page is mounted. */
export function usePageBreadcrumb(label: string | undefined) {
  const setBreadcrumbExtra = usePageActionsStore((state) => state.setBreadcrumbExtra)

  useEffect(() => {
    setBreadcrumbExtra(label ?? null)
    return () => setBreadcrumbExtra(null)
  }, [label, setBreadcrumbExtra])
}
