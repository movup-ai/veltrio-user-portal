import { apiClient } from '@/services/api/client'
import type { Brand, BrandAsset, BrandValues } from '../types/brand.types'
import { toBrand, toBrandPayload, type BrandWire } from './settings.mapper'

export const brandApi = {
  get: (): Promise<Brand> => apiClient.get<BrandWire>('/tenant/brand').then((r) => toBrand(r.data)),

  update: (patch: Partial<BrandValues>): Promise<Brand> =>
    apiClient.patch<BrandWire>('/tenant/brand', toBrandPayload(patch)).then((r) => toBrand(r.data)),

  /** Straight to the API, which renders it before answering, so the new URL is ready to show. */
  upload: (asset: BrandAsset, file: File): Promise<Brand> => {
    const form = new FormData()
    form.append('file', file)
    return apiClient
      .put<BrandWire>(`/tenant/brand/${asset}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => toBrand(r.data))
  },

  remove: (asset: BrandAsset): Promise<Brand> =>
    apiClient.delete<BrandWire>(`/tenant/brand/${asset}`).then((r) => toBrand(r.data)),
}
