import { apiClient } from '@/services/api/client'
import type {
  AgreementTemplate,
  AgreementTemplateSummary,
  AgreementTemplateValues,
} from '../types/agreement-template.types'
import {
  toAgreementTemplate,
  toAgreementTemplatePayload,
  toAgreementTemplateSummary,
  type AgreementTemplateSummaryWire,
  type AgreementTemplateWire,
} from './contract.mapper'

const BASE = '/agreement-templates'

const one = (request: Promise<{ data: AgreementTemplateWire }>) => request.then((r) => toAgreementTemplate(r.data))

export const agreementTemplateApi = {
  /** The default first, then by name. Without the text, which is read one template at a time. */
  list: (): Promise<AgreementTemplateSummary[]> =>
    apiClient.get<AgreementTemplateSummaryWire[]>(BASE).then((r) => r.data.map(toAgreementTemplateSummary)),

  get: (id: string): Promise<AgreementTemplate> => one(apiClient.get<AgreementTemplateWire>(`${BASE}/${id}`)),

  create: (values: AgreementTemplateValues): Promise<AgreementTemplate> =>
    one(apiClient.post<AgreementTemplateWire>(BASE, toAgreementTemplatePayload(values))),

  update: (id: string, values: AgreementTemplateValues): Promise<AgreementTemplate> =>
    one(apiClient.put<AgreementTemplateWire>(`${BASE}/${id}`, toAgreementTemplatePayload(values))),

  makeDefault: (id: string): Promise<AgreementTemplate> =>
    one(apiClient.post<AgreementTemplateWire>(`${BASE}/${id}/default`)),

  remove: (id: string): Promise<void> => apiClient.delete(`${BASE}/${id}`).then(() => undefined),

  /** The text as a renter's PDF, around made-up rental details. Takes text that is not saved yet. */
  preview: (body: string): Promise<Blob> =>
    apiClient.post<Blob>(`${BASE}/preview`, { body: body.trim() }, { responseType: 'blob' }).then((r) => r.data),
}
