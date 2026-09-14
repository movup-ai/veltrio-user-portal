import { create } from 'zustand'
import type { LucideIcon } from 'lucide-react'

export interface HeaderAction {
  label: string
  icon: LucideIcon
  onClick?: () => void
}

interface PageActionsState {
  headerActions: HeaderAction[]
  setHeaderActions: (actions: HeaderAction[]) => void
}

/**
 * Lets the currently-mounted page hand the persistent sticky Header a
 * page-specific primary action ("New booking", "Add vehicle", ...) without
 * threading props through the layout tree. Each page sets this on mount and
 * clears it on unmount (see usePageHeaderActions).
 */
export const usePageActionsStore = create<PageActionsState>((set) => ({
  headerActions: [],
  setHeaderActions: (actions) => set({ headerActions: actions }),
}))
