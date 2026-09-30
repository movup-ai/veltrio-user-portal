import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UploadedFile } from '@/types/common'
import { DocumentUpload } from './DocumentUpload'

/** A file the counter has just picked, as the slot stores it. */
function picked(name: string, type: string): UploadedFile {
  const file = new File(['x'], name, { type })
  return { id: 'f1', name, size: 1024, file }
}

const IMAGE = picked('licence.jpg', 'image/jpeg')
const PDF = picked('policy.pdf', 'application/pdf')

let created: string[]
let revoked: Set<string>

/** Whether a URL still points at the file - one revoked renders as a broken image. */
const isLive = (url: string | null) => url !== null && created.includes(url) && !revoked.has(url)

describe('DocumentUpload', () => {
  beforeEach(() => {
    // jsdom implements neither, and both are called on the object URL.
    created = []
    revoked = new Set()
    URL.createObjectURL = vi.fn(() => {
      created.push(`blob:${created.length + 1}`)
      return created.at(-1)!
    })
    URL.revokeObjectURL = vi.fn((url: string) => void revoked.add(url))
  })

  it('previews a picked image full size without going to the network', async () => {
    const user = userEvent.setup()
    render(<DocumentUpload value={IMAGE} onChange={vi.fn()} label="Driving licence" />)

    await user.click(screen.getByRole('button', { name: 'upload.preview' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('licence.jpg')
    // The blob URL is the local file — nothing is fetched to show it.
    expect(isLive(screen.getByAltText('licence.jpg').getAttribute('src'))).toBe(true)
  })

  it('offers a download rather than a preview for a file that is not an image', () => {
    render(<DocumentUpload value={PDF} onChange={vi.fn()} label="Insurance document" />)

    expect(screen.queryByRole('button', { name: 'upload.preview' })).not.toBeInTheDocument()
    const download = screen.getByRole('link', { name: 'upload.download' })
    expect(isLive(download.getAttribute('href'))).toBe(true)
    expect(download).toHaveAttribute('download', 'policy.pdf')
  })

  it('shows the picture again when the slot comes back, as it does after Review', () => {
    // The form keeps the file while the step is away; the URL was revoked with the old slot,
    // so the thumbnail came back broken.
    const first = render(<DocumentUpload value={IMAGE} onChange={vi.fn()} label="Driving licence" />)
    first.unmount()

    const { container } = render(
      <DocumentUpload value={IMAGE} onChange={vi.fn()} label="Driving licence" />,
    )

    expect(isLive(container.querySelector('img')!.getAttribute('src'))).toBe(true)
  })

  it('releases the object URL when the slot leaves the page', () => {
    const { container, unmount } = render(
      <DocumentUpload value={IMAGE} onChange={vi.fn()} label="Driving licence" />,
    )
    const url = container.querySelector('img')!.getAttribute('src')!

    unmount()

    expect(revoked.has(url)).toBe(true)
  })

  it('releases the object URL when the file is removed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { container, rerender } = render(
      <DocumentUpload value={IMAGE} onChange={onChange} label="Driving licence" />,
    )
    const url = container.querySelector('img')!.getAttribute('src')!

    await user.click(screen.getByRole('button', { name: 'upload.remove' }))
    rerender(<DocumentUpload value={null} onChange={onChange} label="Driving licence" />)

    expect(onChange).toHaveBeenCalledWith(null)
    expect(revoked.has(url)).toBe(true)
  })
})
