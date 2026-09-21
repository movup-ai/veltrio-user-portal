import { apiClient } from '@/services/api/client'
import { toImportResult, type ImportCommitWire, type ImportPreview } from './vehicle.mapper'

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

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
      .post<ImportCommitWire>('/vehicles/import', { vehicles })
      .then((r) => toImportResult(r.data)),

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
