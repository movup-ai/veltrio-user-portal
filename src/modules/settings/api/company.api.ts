import type { CancellationPolicy } from '@/lib/cancellation-policy'
import { apiClient } from '@/services/api/client'
import type { Company, CompanyPatch } from '../types/company.types'
import { toCompany, toCompanyPayload, type CompanyWire } from './settings.mapper'

export const companyApi = {
  get: (): Promise<Company> => apiClient.get<CompanyWire>('/tenant').then((r) => toCompany(r.data)),

  update: (patch: CompanyPatch): Promise<Company> =>
    apiClient.patch<CompanyWire>('/tenant', toCompanyPayload(patch)).then((r) => toCompany(r.data)),

  /** Null withdraws the policy; an empty list states a non-refundable one. */
  setCancellationPolicy: (policy: CancellationPolicy | undefined): Promise<Company> =>
    apiClient
      .patch<CompanyWire>('/tenant', { cancellationPolicy: policy ?? null })
      .then((r) => toCompany(r.data)),
}
