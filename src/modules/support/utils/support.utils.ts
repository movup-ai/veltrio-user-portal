import type { TFunction } from 'i18next'
import type { Column, Row } from '@/components/data-display/record-table.types'
import {
  ACCEPTED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from '../constants/support.constants'
import type { TicketRow, TicketStatus } from '../types/support.types'

// Colours from the shared vocabulary: Veltrio's turn reads as information, the company's as a
// warning, since it is the one that needs someone here to act.
const BADGE_STATUS: Record<TicketStatus, string> = {
  open: 'Scheduled',
  waiting_on_customer: 'Pending',
  closed: 'Draft',
}

export function ticketBadgeStatus(status: TicketStatus): string {
  return BADGE_STATUS[status]
}

export function ticketColumns(t: TFunction<'support'>): Column[] {
  return [
    { label: t('columns.id'), align: 'left' },
    { label: t('columns.subject'), align: 'left' },
    { label: t('columns.topic'), align: 'left' },
    { label: t('columns.author'), align: 'left' },
    { label: t('columns.status'), align: 'left' },
    { label: t('columns.lastUpdated'), align: 'right' },
  ]
}

interface RowLabels {
  category: string
  status: string
  lastUpdated: string
}

export function ticketRow(ticket: TicketRow, labels: RowLabels): Row {
  return {
    key: ticket.id,
    cells: [
      { kind: 'text', primary: `#${ticket.number}`, fontMono: true },
      { kind: 'stack', primary: ticket.subject },
      { kind: 'text', primary: labels.category },
      { kind: 'text', primary: ticket.authorName ?? '—' },
      { kind: 'badge', status: ticketBadgeStatus(ticket.status), label: labels.status },
      { kind: 'text', primary: labels.lastUpdated, align: 'right' },
    ],
  }
}

export type AttachmentProblem = 'type' | 'size' | 'count'

/** Why a picked file cannot go with the message, checked before anything is uploaded. */
export function attachmentProblem(
  file: Pick<File, 'type' | 'size'>,
  alreadyPicked: number,
): AttachmentProblem | undefined {
  if (alreadyPicked >= MAX_ATTACHMENTS_PER_MESSAGE) return 'count'
  if (!(ACCEPTED_ATTACHMENT_TYPES as readonly string[]).includes(file.type)) return 'type'
  if (file.size > MAX_ATTACHMENT_BYTES) return 'size'
  return undefined
}

// HEIC is accepted but most browsers cannot draw it, so it is offered as a file instead.
const PREVIEWABLE_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** Whether the browser can show this file as a picture, as a thumbnail and full size. */
export function isPreviewableImage(contentType: string): boolean {
  return PREVIEWABLE_IMAGES.includes(contentType)
}
