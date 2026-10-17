import type { PresignedUpload } from '@/modules/vehicles/api/vehicle.mapper'
import type {
  MessageSide,
  Ticket,
  TicketAttachment,
  TicketCategory,
  TicketMessage,
  TicketRow,
  TicketStatus,
} from '../types/support.types'

// Categories and statuses travel as the same slugs on both sides; only `null` ↔ `undefined` changes.
export interface TicketRowWire {
  id: string
  number: number
  subject: string
  category: TicketCategory
  status: TicketStatus
  authorName: string | null
  createdAt: string
  lastMessageAt: string
}

export type TicketAttachmentWire = TicketAttachment

interface TicketMessageWire {
  id: string
  side: MessageSide
  authorName: string | null
  body: string
  createdAt: string
  attachments: TicketAttachmentWire[]
}

export interface TicketWire extends TicketRowWire {
  closedAt: string | null
  messages: TicketMessageWire[]
}

export interface AttachmentUploadSlotWire {
  attachment: TicketAttachmentWire
  upload: PresignedUpload
}

export function toTicketRow({ authorName, ...rest }: TicketRowWire): TicketRow {
  return { ...rest, authorName: authorName ?? undefined }
}

function toTicketMessage({ authorName, ...rest }: TicketMessageWire): TicketMessage {
  return { ...rest, authorName: authorName ?? undefined }
}

export function toTicket({ closedAt, messages, ...row }: TicketWire): Ticket {
  return { ...toTicketRow(row), closedAt: closedAt ?? undefined, messages: messages.map(toTicketMessage) }
}
