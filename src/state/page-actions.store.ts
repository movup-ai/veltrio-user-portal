import { create } from 'zustand'

interface PageActionsState {
  /** Third breadcrumb segment for record-detail pages (e.g. "Jeep Wrangler Sport"), null on list/index pages. */
  breadcrumbExtra: string | null
  setBreadcrumbExtra: (label: string | null) => void
}

/**
 * Lets a record-detail page name itself in the sticky Header's breadcrumb without threading
 * props through the layout tree. Set on mount, cleared on unmount (see usePageBreadcrumb).
 */
export const usePageActionsStore = create<PageActionsState>((set) => ({
  breadcrumbExtra: null,
  setBreadcrumbExtra: (label) => set({ breadcrumbExtra: label }),
}))
