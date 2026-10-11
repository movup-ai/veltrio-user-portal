import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomerDocument } from '../types/customer.types'

const upload = vi.fn()
let documents: CustomerDocument[] = []

vi.mock('../hooks/use-customers', () => ({
  useCustomerDocuments: () => ({ data: documents, isLoading: false, isError: false, refetch: vi.fn() }),
  useUploadCustomerDocument: () => ({ mutate: upload, isPending: false, variables: undefined }),
}))

// The scan on file has its own tests; here it only needs to offer the replace button.
vi.mock('./DocumentOnFile', () => ({
  DocumentOnFile: ({ document, onReplace }: { document: CustomerDocument; onReplace: () => void }) => (
    <button type="button" onClick={onReplace}>
      Replace {document.name}
    </button>
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

describe('CustomerDocuments', () => {
  beforeEach(() => {
    upload.mockReset()
    documents = [LICENCE]
  })

  it('replaces a scan straight from the file picker, leaving it in place until one is chosen', async () => {
    const user = userEvent.setup({ delay: null })
    render(<CustomerDocuments customerId="c1" canEdit />)

    // Pressing replace opens the picker: the scan stays on screen and no Cancel appears.
    await user.click(screen.getByRole('button', { name: 'Replace licence.jpg' }))
    expect(screen.getByRole('button', { name: 'Replace licence.jpg' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    expect(upload).not.toHaveBeenCalled()

    const file = scan('renewed.jpg')
    await user.upload(screen.getByLabelText('Replace Driver licence'), file)

    expect(upload).toHaveBeenCalledWith({ kind: 'licence', file })
  })

  it('offers a slot to add the scan a customer does not have yet', async () => {
    const user = userEvent.setup({ delay: null })
    const { container } = render(<CustomerDocuments customerId="c1" canEdit />)

    // The empty slot's own input; the labelled one beside it replaces the licence.
    const slot = container.querySelector<HTMLInputElement>('input[type="file"]:not([aria-label])')
    const file = scan('insurance.jpg')
    await user.upload(slot!, file)

    expect(upload).toHaveBeenCalledWith({ kind: 'insurance', file })
  })

  it('gives someone who cannot edit nothing to upload with', () => {
    const { container } = render(<CustomerDocuments customerId="c1" canEdit={false} />)

    expect(container.querySelector('input[type="file"]')).toBeNull()
    expect(screen.getByText('None on file')).toBeInTheDocument()
  })
})
