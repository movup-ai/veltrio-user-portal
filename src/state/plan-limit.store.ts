import { create } from 'zustand'
import type { PlanLimit } from '@/modules/billing/types/billing.types'

interface PlanLimitState {
  /** The limit the open dialog is about; absent while it is closed. */
  limit?: PlanLimit
  show: (limit: PlanLimit) => void
  close: () => void
}

/** One plan-limit dialog for the whole portal, opened from wherever a vehicle or branch is added. */
export const usePlanLimitStore = create<PlanLimitState>((set) => ({
  limit: undefined,
  show: (limit) => set({ limit }),
  close: () => set({ limit: undefined }),
}))
