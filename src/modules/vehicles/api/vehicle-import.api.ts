import { apiClient } from '@/services/api/client'
import type { Vehicle } from '../types/vehicle.types'
import { toVehicle, type VehicleWire } from './vehicle.mapper'

export type ImportRowStatus = 'valid' | 'error' | 'duplicate'

export interface ImportRowError {
  column: string | null
  message: string
}

/** `values` is the parsed row, echoed back on commit so the file is only parsed once. */
export interface ImportRow {
  row: number
  status: ImportRowStatus
  errors: ImportRowError[]
  make: string | null
  model: string | null
  plate: string | null
  vin: string | null
  values: unknown | null
}

export interface ImportPreview {
  total: number
  valid: number
  rows: ImportRow[]
}

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024
export const ACCEPTED_IMPORT_TYPES = ['text/csv', 'application/vnd.ms-excel', '.csv'] as const

export const vehicleImportApi = {
  preview: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient
      .post<ImportPreview>('/vehicles/import/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  commit: (vehicles: unknown[]) =>
    apiClient
      .post<{ imported: number; vehicles: VehicleWire[] }>('/vehicles/import', { vehicles })
      .then((r) => ({ imported: r.data.imported, vehicles: r.data.vehicles.map(toVehicle) as Vehicle[] })),

  /** Fetched rather than linked: the endpoint needs the auth and tenant headers. */
  downloadTemplate: async () => {
    const response = await apiClient.get<Blob>('/vehicles/import/template', {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = 'vehicles-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  },
}
