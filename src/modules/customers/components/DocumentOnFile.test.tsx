import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomerDocument } from '../types/customer.types'

const downloadUrl = vi.fn()

vi.mock('../api/customer-document.api', () => ({
  customerDocumentApi: {
    downloadUrl: (...args: unknown[]) => downloadUrl(...args),
  },
  isImageDocument: (contentType: string) => contentType.startsWith('image/'),
}))

const { DocumentOnFile } = await import('./DocumentOnFile')

function document(overrides: Partial<CustomerDocument> = {}): CustomerDocument {
  return {
    id: 'doc1',
    kind: 'licence',
    status: 'ready',
    name: 'licence.pdf',
    contentType: 'application/pdf',
    sizeBytes: 2048,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

const IMAGE = document({ name: 'licence.jpg', contentType: 'image/jpeg' })

describe('DocumentOnFile', () => {
  beforeEach(() => {
    downloadUrl.mockReset()
    downloadUrl.mockResolvedValue('https://storage.example/signed?sig=abc')
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  it('names the file and says it is already held', () => {
    render(<DocumentOnFile customerId="c1" document={document()} onReplace={vi.fn()} />)

    expect(screen.getByText('licence.pdf')).toBeInTheDocument()
    expect(screen.getByText(/already on file/i)).toBeInTheDocument()
  })

  it('shows a thumbnail for an image, asking for a link it can render inline', async () => {
    const { container } = render(<DocumentOnFile customerId="c1" document={IMAGE} onReplace={vi.fn()} />)

    // alt="" on purpose — the filename sits beside it, so the thumbnail is decorative and
    // carries no img role for a screen reader to announce twice.
    await waitFor(() => expect(container.querySelector('img')).toBeInTheDocument())
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://storage.example/signed?sig=abc')
    // `true` is the inline flag: without it the browser would download instead of render.
    expect(downloadUrl).toHaveBeenCalledWith('c1', 'doc1', true)
  })

  it('never fetches a link for a PDF until it is opened', async () => {
    const user = userEvent.setup()
    render(<DocumentOnFile customerId="c1" document={document()} onReplace={vi.fn()} />)

    // Nothing up front: each link is short-lived and its issue is audited.
    expect(downloadUrl).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /download licence\.pdf/i }))

    expect(downloadUrl).toHaveBeenCalledWith('c1', 'doc1', false)
    expect(window.open).toHaveBeenCalledWith(
      'https://storage.example/signed?sig=abc',
      '_blank',
      'noopener,noreferrer',
    )
  })

  it('opens an image full size in a dialog rather than a new tab', async () => {
    const user = userEvent.setup()
    const { container } = render(<DocumentOnFile customerId="c1" document={IMAGE} onReplace={vi.fn()} />)

    await waitFor(() => expect(container.querySelector('img')).toBeInTheDocument())
    // Both the thumbnail and the trailing button open it; the thumbnail comes first.
    await user.click(screen.getAllByRole('button', { name: /view licence\.jpg/i })[0])

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('licence.jpg')
    expect(window.open).not.toHaveBeenCalled()
  })

  it('hands back to the picker when the counter chooses to replace it', async () => {
    const user = userEvent.setup()
    const onReplace = vi.fn()
    render(<DocumentOnFile customerId="c1" document={document()} onReplace={onReplace} />)

    await user.click(screen.getByRole('button', { name: /replace licence\.pdf/i }))

    expect(onReplace).toHaveBeenCalledOnce()
  })

  it('falls back to the icon when the thumbnail link has expired', async () => {
    downloadUrl.mockRejectedValue(new Error('gone'))
    const { container } = render(<DocumentOnFile customerId="c1" document={IMAGE} onReplace={vi.fn()} />)

    await waitFor(() => expect(downloadUrl).toHaveBeenCalled())
    // No broken image: the slot keeps its icon and the row still reads correctly.
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText('licence.jpg')).toBeInTheDocument()
  })
})
