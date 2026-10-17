import { describe, expect, it } from 'vitest'
import type { TicketRow } from '../types/support.types'
import { attachmentProblem, isPreviewableImage, ticketBadgeStatus, ticketRow } from './support.utils'

const ticket: TicketRow = {
  id: 't-1',
  number: 1042,
  subject: "Can't add a vehicle",
  category: 'technical',
  status: 'waiting_on_customer',
  createdAt: '2026-10-17T09:00:00Z',
  lastMessageAt: '2026-10-17T10:00:00Z',
}

describe('ticketBadgeStatus', () => {
  it('gives each status its own colours', () => {
    const colours = (['open', 'waiting_on_customer', 'closed'] as const).map(ticketBadgeStatus)
    expect(new Set(colours).size).toBe(3)
  })

  it('reads a ticket waiting on the company as a warning', () => {
    expect(ticketBadgeStatus('waiting_on_customer')).toBe('Pending')
  })
})

describe('ticketRow', () => {
  const labels = { category: 'Technical problem', status: 'Needs your reply', lastUpdated: 'Oct 17' }

  it('is keyed on the id, with the ticket ID and topic in columns of their own', () => {
    const row = ticketRow(ticket, labels)
    expect(row.key).toBe('t-1')
    expect(row.cells.slice(0, 3)).toEqual([
      { kind: 'text', primary: '#1042', fontMono: true },
      { kind: 'stack', primary: "Can't add a vehicle" },
      { kind: 'text', primary: 'Technical problem' },
    ])
  })

  it('shows a dash for an author whose account is gone', () => {
    expect(ticketRow(ticket, labels).cells[3]).toMatchObject({ kind: 'text', primary: '—' })
  })

  it('keeps the status colours under the support wording', () => {
    expect(ticketRow(ticket, labels).cells[4]).toEqual({
      kind: 'badge',
      status: 'Pending',
      label: 'Needs your reply',
    })
  })
})

describe('attachmentProblem', () => {
  const png = { type: 'image/png', size: 1024 }

  it('accepts a screenshot', () => {
    expect(attachmentProblem(png, 0)).toBeUndefined()
  })

  it('refuses a type the API would refuse, such as a page that could run', () => {
    expect(attachmentProblem({ type: 'text/html', size: 10 }, 0)).toBe('type')
    // A file the browser cannot type arrives with an empty one.
    expect(attachmentProblem({ type: '', size: 10 }, 0)).toBe('type')
  })

  it('refuses a file over 10 MB, and takes one of exactly 10 MB', () => {
    expect(attachmentProblem({ type: 'application/pdf', size: 10 * 1024 * 1024 }, 0)).toBeUndefined()
    expect(attachmentProblem({ type: 'application/pdf', size: 10 * 1024 * 1024 + 1 }, 0)).toBe('size')
  })

  it('refuses a sixth file on one message', () => {
    expect(attachmentProblem(png, 4)).toBeUndefined()
    expect(attachmentProblem(png, 5)).toBe('count')
  })
})

describe('isPreviewableImage', () => {
  it('shows the picture formats a browser can draw', () => {
    expect(['image/jpeg', 'image/png', 'image/webp', 'image/gif'].every(isPreviewableImage)).toBe(true)
  })

  it('offers HEIC, PDF and text as files, not pictures', () => {
    expect(isPreviewableImage('image/heic')).toBe(false)
    expect(isPreviewableImage('application/pdf')).toBe(false)
    expect(isPreviewableImage('text/csv')).toBe(false)
  })
})
