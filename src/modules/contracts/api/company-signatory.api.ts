import { apiClient } from '@/services/api/client'
import type { CompanySignatory, CompanySignatoryInput } from '../types/company-signatory.types'
import { toCompanySignatory, toCompanySignatoryPayload, type CompanySignatoryWire } from './contract.mapper'

const BASE = '/agreement-signatory'

/** Who signs agreements for the company. Owner-only on the API. */
export const companySignatoryApi = {
  get: (): Promise<CompanySignatory> =>
    apiClient.get<CompanySignatoryWire>(BASE).then((r) => toCompanySignatory(r.data)),

  /** Applies to agreements issued from now on; those already issued keep their signature. */
  save: (input: CompanySignatoryInput): Promise<CompanySignatory> =>
    apiClient
      .put<CompanySignatoryWire>(BASE, toCompanySignatoryPayload(input))
      .then((r) => toCompanySignatory(r.data)),

  remove: (): Promise<void> => apiClient.delete(BASE).then(() => undefined),
}
