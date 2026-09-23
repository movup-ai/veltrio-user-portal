import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UploadedFile } from '@/types/common'
import { DocumentUpload } from './DocumentUpload'

/** A file the counter has just picked, as the slot stores it. */
function picked(name: string, type: string): UploadedFile {
  const file = new File(['x'], name, { type })
  return { id: 'f1', name, url: `blob:${name}`, size: 1024, file }
}

const IMAGE = picked('licence.jpg', 'image/jpeg')
const PDF = picked('policy.pdf', 'application/pdf')

describe('DocumentUpload', () => {
  beforeEach(() => {
    // jsdom implements neither, and both are called on the object URL.
    URL.createObjectURL = vi.fn(() => 'blob:new')
    URL.revokeObjectURL = vi.fn()
  })

  it('previews a picked image full size without going to the network', async () => {
    const user = userEvent.setup()
    render(<DocumentUpload value={IMAGE} onChange={vi.fn()} label="Driving licence" />)

    await user.click(screen.getByRole('button', { name: 'upload.preview' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('licence.jpg')
    // The blob URL is the local file — nothing is fetched to show it.
    expect(screen.getByAltText('licence.jpg')).toHaveAttribute('src', 'blob:licence.jpg')
  })

  it('offers a download rather than a preview for a file that is not an image', () => {
    render(<DocumentUpload value={PDF} onChange={vi.fn()} label="Insurance document" />)

    expect(screen.queryByRole('button', { name: 'upload.preview' })).not.toBeInTheDocument()
    const download = screen.getByRole('link', { name: 'upload.download' })
    expect(download).toHaveAttribute('href', 'blob:policy.pdf')
    expect(download).toHaveAttribute('download', 'policy.pdf')
  })

  it('releases the object URL when the file is removed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DocumentUpload value={IMAGE} onChange={onChange} label="Driving licence" />)

    await user.click(screen.getByRole('button', { name: 'upload.remove' }))

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:licence.jpg')
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
