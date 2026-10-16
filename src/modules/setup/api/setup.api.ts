import { apiClient } from '@/services/api/client'
import type { Setup, SetupPatch } from '../types/setup.types'
import { toSetup, type SetupWire } from './setup.mapper'

export const setupApi = {
  get: (): Promise<Setup> => apiClient.get<SetupWire>('/tenant/setup').then((r) => toSetup(r.data)),

  update: (patch: SetupPatch): Promise<Setup> =>
    apiClient.patch<SetupWire>('/tenant/setup', patch).then((r) => toSetup(r.data)),
}
