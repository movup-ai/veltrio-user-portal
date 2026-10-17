export const TICKET_CATEGORIES = ['question', 'technical', 'billing', 'feature_request', 'other'] as const
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

export const TICKET_STATUSES = ['open', 'waiting_on_customer', 'closed'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export type MessageSide = 'company' | 'platform'

export interface TicketRow {
  id: string
  number: number
  subject: string
  category: TicketCategory
  status: TicketStatus
  authorName?: string
  createdAt: string
  lastMessageAt: string
}

export interface TicketMessage {
  id: string
  side: MessageSide
  /** Absent on Veltrio's messages: they come from "Veltrio support", not a named person. */
  authorName?: string
  body: string
  createdAt: string
  attachments: TicketAttachment[]
}

export interface TicketAttachment {
  id: string
  name: string
  contentType: string
  sizeBytes: number
}

export interface Ticket extends TicketRow {
  closedAt?: string
  messages: TicketMessage[]
}

export interface TicketInput {
  subject: string
  category: TicketCategory
  body: string
  attachmentIds: string[]
}

export interface TicketListParams {
  status?: TicketStatus
  page: number
  pageSize: number
}
