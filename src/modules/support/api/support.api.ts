import { toLimitOffset, toPaginatedResult, type ListEnvelope } from '@/lib/pagination'
import { vehiclePhotoApi } from '@/modules/vehicles/api/vehicle-photo.api'
import { apiClient } from '@/services/api/client'
import type { PaginatedResult } from '@/types/common'
import type {
  Ticket,
  TicketAttachment,
  TicketInput,
  TicketListParams,
  TicketRow,
} from '../types/support.types'
import {
  toTicket,
  toTicketRow,
  type AttachmentUploadSlotWire,
  type TicketAttachmentWire,
  type TicketRowWire,
  type TicketWire,
} from './support.mapper'

export const supportApi = {
  page: (params: TicketListParams): Promise<PaginatedResult<TicketRow>> =>
    apiClient
      .get<ListEnvelope<TicketRowWire>>('/support/tickets', {
        params: { status: params.status, ...toLimitOffset(params) },
      })
      .then((r) => toPaginatedResult(r.data.items.map(toTicketRow), r.data.total, params)),

  get: (id: string): Promise<Ticket> =>
    apiClient.get<TicketWire>(`/support/tickets/${id}`).then((r) => toTicket(r.data)),

  create: (input: TicketInput): Promise<Ticket> =>
    apiClient.post<TicketWire>('/support/tickets', input).then((r) => toTicket(r.data)),

  reply: (id: string, body: string, attachmentIds: string[]): Promise<Ticket> =>
    apiClient
      .post<TicketWire>(`/support/tickets/${id}/messages`, { body, attachmentIds })
      .then((r) => toTicket(r.data)),

  close: (id: string): Promise<Ticket> =>
    apiClient.post<TicketWire>(`/support/tickets/${id}/close`).then((r) => toTicket(r.data)),

  /**
   * A file picked for a message not yet sent: reserved, posted straight to storage, then
   * confirmed. Its id goes out with the message; one never sent is removed after a day.
   */
  uploadAttachment: async (file: File, onProgress?: (percent: number) => void): Promise<TicketAttachment> => {
    const slot = await apiClient
      .post<AttachmentUploadSlotWire>('/support/attachments', {
        name: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      })
      .then((r) => r.data)
    await vehiclePhotoApi.uploadToStorage(slot.upload, file, onProgress)
    return apiClient
      .post<TicketAttachmentWire>(`/support/attachments/${slot.attachment.id}/complete`)
      .then((r) => r.data)
  },

  /** A link that expires in minutes, so it is asked for at the moment the file is opened. */
  attachmentUrl: (ticketId: string, attachmentId: string, inline: boolean): Promise<string> =>
    apiClient
      .get<{ url: string; expiresAt: string }>(
        `/support/tickets/${ticketId}/attachments/${attachmentId}/download`,
        {
          params: inline ? { inline: true } : undefined,
        },
      )
      .then((r) => r.data.url),
}
