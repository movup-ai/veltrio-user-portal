import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { Ticket, TicketAttachment } from '../types/support.types'

const reply = vi.fn<(id: string, body: string, attachmentIds: string[]) => Promise<Ticket>>()
const uploadAttachment = vi.fn<(file: File) => Promise<TicketAttachment>>()
const attachmentUrl = vi.fn<(ticketId: string, attachmentId: string, inline: boolean) => Promise<string>>()

vi.mock('../api/support.api', () => ({
  supportApi: {
    reply: (id: string, body: string, ids: string[]) => reply(id, body, ids),
    uploadAttachment: (file: File) => uploadAttachment(file),
    attachmentUrl: (ticketId: string, attachmentId: string, inline: boolean) =>
      attachmentUrl(ticketId, attachmentId, inline),
    close: vi.fn(),
  },
}))

const { TicketThread } = await import('./TicketThread')

const screenshot: TicketAttachment = {
  id: 'a-1',
  name: 'screen.png',
  contentType: 'image/png',
  sizeBytes: 2048,
}
const statement: TicketAttachment = {
  id: 'a-2',
  name: 'statement.pdf',
  contentType: 'application/pdf',
  sizeBytes: 4096,
}

const ticket: Ticket = {
  id: 't-1',
  number: 1042,
  subject: "Can't add a vehicle",
  category: 'technical',
  status: 'waiting_on_customer',
  authorName: 'Pat Owner',
  createdAt: '2026-10-17T09:00:00Z',
  lastMessageAt: '2026-10-17T10:00:00Z',
  messages: [
    {
      id: 'm-1',
      side: 'company',
      authorName: 'Pat Owner',
      body: 'The save button spins.',
      createdAt: '2026-10-17T09:00:00Z',
      attachments: [screenshot, statement],
    },
    {
      id: 'm-2',
      side: 'platform',
      body: 'Try reloading.',
      createdAt: '2026-10-17T10:00:00Z',
      attachments: [],
    },
  ],
}

function renderThread(shown: Ticket = ticket) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <TicketThread ticket={shown} />
    </QueryClientProvider>,
  )
}

function pngFile(name = 'error.png') {
  return new File(['png'], name, { type: 'image/png' })
}

beforeEach(() => {
  reply.mockReset()
  uploadAttachment.mockReset()
  attachmentUrl.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ticket thread', () => {
  it("names Veltrio's messages as Veltrio Support, not as a person", () => {
    renderThread()

    expect(screen.getByText('Veltrio Support')).toBeInTheDocument()
    expect(screen.getByText('Try reloading.')).toBeInTheDocument()
  })

  it('keeps a reply that failed to send, so it can be sent again', async () => {
    reply.mockRejectedValue(new Error('Network down'))
    const user = userEvent.setup({ delay: null })
    renderThread()

    await user.type(screen.getByLabelText('Reply'), 'Still stuck.')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')
    expect(screen.getByLabelText('Reply')).toHaveValue('Still stuck.')
  })

  it('clears the box once the reply is sent', async () => {
    reply.mockResolvedValue(ticket)
    const user = userEvent.setup({ delay: null })
    renderThread()

    await user.type(screen.getByLabelText('Reply'), '  Still stuck.  ')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))

    await vi.waitFor(() => expect(screen.getByLabelText('Reply')).toHaveValue(''))
    expect(reply).toHaveBeenCalledWith('t-1', 'Still stuck.', [])
  })

  it('offers no close button on a closed ticket, and says a reply reopens it', () => {
    renderThread({ ...ticket, status: 'closed', closedAt: '2026-10-17T11:00:00Z' })

    expect(screen.queryByRole('button', { name: 'Close ticket' })).not.toBeInTheDocument()
    expect(screen.getByText('Replying opens the ticket again.')).toBeInTheDocument()
  })
})

describe('ticket attachments', () => {
  it('sends an uploaded file with the reply, then clears it', async () => {
    uploadAttachment.mockResolvedValue({
      id: 'a-9',
      name: 'error.png',
      contentType: 'image/png',
      sizeBytes: 3,
    })
    reply.mockResolvedValue(ticket)
    const user = userEvent.setup({ delay: null })
    renderThread()

    await user.upload(document.body.querySelector<HTMLInputElement>('input[type="file"]')!, pngFile())
    await screen.findByText('3 B')
    await user.type(screen.getByLabelText('Reply'), 'Here it is.')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))

    expect(reply).toHaveBeenCalledWith('t-1', 'Here it is.', ['a-9'])
    await vi.waitFor(() => expect(screen.queryByText('error.png')).not.toBeInTheDocument())
  })

  it('holds the reply while a file is still uploading', async () => {
    uploadAttachment.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup({ delay: null })
    renderThread()

    await user.upload(document.body.querySelector<HTMLInputElement>('input[type="file"]')!, pngFile())
    await user.type(screen.getByLabelText('Reply'), 'Here it is.')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Wait for the files to finish uploading')
    expect(reply).not.toHaveBeenCalled()
  })

  it('opens a PDF in a tab taken in the click, with a fresh link', async () => {
    const tab = { opener: {}, location: { href: '' }, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    attachmentUrl.mockResolvedValue('https://storage.example/signed?sig=abc')
    const user = userEvent.setup({ delay: null })
    renderThread()

    await user.click(screen.getByRole('button', { name: 'Open statement.pdf' }))

    await vi.waitFor(() => expect(tab.location.href).toBe('https://storage.example/signed?sig=abc'))
    expect(attachmentUrl).toHaveBeenCalledWith('t-1', 'a-2', true)
    expect(tab.opener).toBeNull()
  })

  it('shows a picture as a thumbnail that opens full size on the page', async () => {
    attachmentUrl.mockResolvedValue('https://storage.example/screen?sig=abc')
    const user = userEvent.setup({ delay: null })
    renderThread()

    await user.click(await screen.findByRole('button', { name: 'Preview screen.png' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('img', { name: 'screen.png' })).toHaveAttribute(
      'src',
      'https://storage.example/screen?sig=abc',
    )
    expect(within(dialog).getByRole('link', { name: 'Open original' })).toHaveAttribute(
      'href',
      'https://storage.example/screen?sig=abc',
    )
  })

  it('lets a picked picture be checked full size before it is sent', async () => {
    uploadAttachment.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup({ delay: null })
    renderThread()

    await user.upload(document.body.querySelector<HTMLInputElement>('input[type="file"]')!, pngFile())
    await user.click(screen.getByRole('button', { name: 'Preview error.png' }))

    expect(within(screen.getByRole('dialog')).getByRole('img', { name: 'error.png' })).toBeInTheDocument()
  })
})
