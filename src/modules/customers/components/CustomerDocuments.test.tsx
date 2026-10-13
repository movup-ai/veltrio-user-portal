import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render as rtlRender, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomerBookingDocument, CustomerDocument, DocumentKind } from '../types/customer.types'

/** Each upload in flight, so a test decides when (and whether) it finishes. */
const uploads: { kind: DocumentKind; file: File; finish: () => void }[] = []
let documents: CustomerDocument[] = []
let sent: CustomerBookingDocument[] = []
let listFails = false
let sentFails = false

// The real hooks run, so two uploads at once behave as they would on the page.
vi.mock('../api/customer-document.api', () => ({
  ACCEPTED_DOCUMENT_TYPES: ['image/jpeg', 'application/pdf'],
  MAX_DOCUMENT_BYTES: 10 * 1024 * 1024,
  customerDocumentApi: {
    list: () => (listFails ? Promise.reject(new Error('offline')) : Promise.resolve(documents)),
    listSent: () => (sentFails ? Promise.reject(new Error('offline')) : Promise.resolve(sent)),
  },
  uploadCustomerDocuments: vi.fn(),
  uploadCustomerDocument: (_: string, kind: DocumentKind, file: File) =>
    new Promise<void>((resolve) => {
      uploads.push({ kind, file, finish: resolve })
    }),
}))

// The scan on file has its own tests; here it only needs to offer what it was handed.
vi.mock('./DocumentOnFile', () => ({
  DocumentOnFile: ({
    document,
    onReplace,
    sentWith,
  }: {
    document: CustomerDocument
    onReplace?: () => void
    sentWith?: string
  }) => (
    <div>
      <span>{document.name}</span>
      {sentWith && <span>from {sentWith}</span>}
      {onReplace && (
        <button type="button" onClick={onReplace}>
          Replace {document.name}
        </button>
      )}
    </div>
  ),
}))

const { CustomerDocuments } = await import('./CustomerDocuments')

const LICENCE: CustomerDocument = {
  id: 'doc1',
  kind: 'licence',
  status: 'ready',
  name: 'licence.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 2048,
  createdAt: '2026-10-01T00:00:00.000Z',
}

const scan = (name: string) => new File(['x'], name, { type: 'image/jpeg' })

async function render(canEdit = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = rtlRender(
    <QueryClientProvider client={client}>
      <CustomerDocuments customerId="c1" canEdit={canEdit} />
    </QueryClientProvider>,
  )
  await screen.findByText('licence.jpg')
  return view
}

/** The empty slot's own input; the labelled one replaces the scan beside it. */
const emptySlot = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('input[type="file"]:not([aria-label])')!

describe('CustomerDocuments', () => {
  beforeEach(() => {
    uploads.length = 0
    documents = [LICENCE]
    sent = []
    listFails = false
    sentFails = false
  })

  it('says so when what the renter sent cannot be read, and reads it on asking again', async () => {
    sentFails = true
    // Insurance: the licence is on file, and a scan on file stands in front of a sent one.
    sent = [{ ...LICENCE, id: 'doc8', kind: 'insurance', name: 'policy.pdf', bookingReference: 'BK-10016' }]
    const user = userEvent.setup({ delay: null })
    await render()

    // Left blank, a failure looked exactly like a renter who had sent nothing.
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("We couldn't load the scans sent with reservations.")
    // The file itself is unaffected: it is another request.
    expect(screen.getByText('licence.jpg')).toBeInTheDocument()

    sentFails = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('policy.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows one scan for each kind: the one on file, or else the one the renter last sent', async () => {
    const policy = { ...LICENCE, id: 'doc7', kind: 'insurance' as const, name: 'policy.pdf' }
    // Newest first, as the API lists them: an older reservation's scan is not the one to show.
    sent = [
      { ...policy, bookingReference: 'BK-10016' },
      { ...policy, id: 'doc3', name: 'old-policy.pdf', bookingReference: 'BK-10002' },
      { ...LICENCE, id: 'doc8', name: 'licence-photo.jpg', bookingReference: 'BK-10016' },
    ]
    const { container } = await render()

    // Insurance has nothing on file, so the renter's own is shown, saying where it came from.
    expect(await screen.findByText('policy.pdf')).toBeInTheDocument()
    expect(screen.getAllByText('from BK-10016')).toHaveLength(1)
    expect(screen.queryByText('old-policy.pdf')).not.toBeInTheDocument()
    // The licence on file is the company's copy, and stands in front of the one they sent.
    expect(screen.getByText('licence.jpg')).toBeInTheDocument()
    expect(screen.queryByText('licence-photo.jpg')).not.toBeInTheDocument()
    // One row each, as these fields look everywhere else: no second box to attach a file in.
    expect(emptySlot(container)).toBeNull()
  })

  it('puts a scan on file from the row of the one the renter sent', async () => {
    sent = [{ ...LICENCE, id: 'doc7', kind: 'insurance', name: 'policy.pdf', bookingReference: 'BK-10016' }]
    const user = userEvent.setup({ delay: null })
    await render()

    await user.click(await screen.findByRole('button', { name: 'Replace policy.pdf' }))
    expect(uploads).toHaveLength(0)
    const file = scan('counter-copy.jpg')
    await user.upload(screen.getByLabelText('Replace Insurance'), file)

    await waitFor(() => expect(uploads).toEqual([expect.objectContaining({ kind: 'insurance', file })]))
  })

  it('still shows an upload as busy after the list failed to refresh and was retried', async () => {
    const user = userEvent.setup({ delay: null })
    const { container } = await render()

    await user.upload(emptySlot(container), scan('insurance.jpg'))
    await user.upload(screen.getByLabelText('Replace Driver licence'), scan('renewed.jpg'))
    await waitFor(() => expect(uploads).toHaveLength(2))

    // The licence finishes and refreshes the list, which fails: the slots give way to the
    // error. The insurance upload is still on its way the whole time.
    listFails = true
    uploads.find((upload) => upload.kind === 'licence')!.finish()
    const retry = await screen.findByRole('button', { name: 'Try again' })
    listFails = false
    await user.click(retry)
    await screen.findByText('licence.jpg')

    // A slot that forgot it would offer the picker again, and a second file could be sent
    // over the first before it lands.
    expect(screen.getByText('Uploading…')).toBeInTheDocument()
    expect(emptySlot(container)).toBeNull()
  })

  it('replaces a scan straight from the file picker, leaving it in place until one is chosen', async () => {
    const user = userEvent.setup({ delay: null })
    await render()

    // Pressing replace opens the picker: the scan stays on screen and no Cancel appears.
    await user.click(screen.getByRole('button', { name: 'Replace licence.jpg' }))
    expect(screen.getByText('licence.jpg')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    expect(uploads).toHaveLength(0)

    const file = scan('renewed.jpg')
    await user.upload(screen.getByLabelText('Replace Driver licence'), file)

    await waitFor(() => expect(uploads).toEqual([expect.objectContaining({ kind: 'licence', file })]))
  })

  it('offers a slot to add the scan a customer does not have yet', async () => {
    const user = userEvent.setup({ delay: null })
    const { container } = await render()

    const file = scan('insurance.jpg')
    await user.upload(emptySlot(container), file)

    await waitFor(() => expect(uploads).toEqual([expect.objectContaining({ kind: 'insurance', file })]))
  })

  it('keeps a slot busy until its own upload ends, whatever the other slot does', async () => {
    const user = userEvent.setup({ delay: null })
    const { container } = await render()

    await user.upload(screen.getByLabelText('Replace Driver licence'), scan('renewed.jpg'))
    await waitFor(() => expect(uploads).toHaveLength(1))
    // A second upload starting must not make the first look finished: the licence could
    // then be replaced again while its upload is still on the way.
    await user.upload(emptySlot(container), scan('insurance.jpg'))
    await waitFor(() => expect(uploads).toHaveLength(2))

    expect(screen.getAllByText('Uploading…')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Replace licence.jpg' })).not.toBeInTheDocument()
  })

  it('gives someone who cannot edit nothing to upload or replace with', async () => {
    const { container } = await render(false)

    expect(container.querySelector('input[type="file"]')).toBeNull()
    // A replace button that opens nothing would be a button that silently does nothing.
    expect(screen.queryByRole('button', { name: /replace/i })).not.toBeInTheDocument()
    expect(screen.getByText('None on file')).toBeInTheDocument()
  })
})
