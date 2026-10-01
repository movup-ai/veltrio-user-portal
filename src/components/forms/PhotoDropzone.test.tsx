import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { PhotoDropzone } from './PhotoDropzone'

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
})

afterEach(() => vi.mocked(toast).mockReset())

describe('PhotoDropzone', () => {
  it('keeps an AVIF and refuses, by name, a file the upload would refuse later', async () => {
    // It took any image/*, so a GIF was held until the first save and then dropped unannounced.
    const onChange = vi.fn()
    // Dropped files skip the picker's filter, so the screening itself has to refuse them.
    const user = userEvent.setup({ delay: null, applyAccept: false })
    const { container } = render(<PhotoDropzone value={[]} onChange={onChange} />)

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, [
      new File(['a'], 'front.avif', { type: 'image/avif' }),
      new File(['b'], 'logo.gif', { type: 'image/gif' }),
    ])

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: 'front.avif' })])
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'logo.gif is not a supported image type' }),
    )
  })

  it('lists AVIF and the extensions in the picker filter', () => {
    const { container } = render(<PhotoDropzone value={[]} onChange={vi.fn()} />)

    const accept = container.querySelector('input[type="file"]')?.getAttribute('accept') ?? ''
    expect(accept.split(',')).toEqual(expect.arrayContaining(['image/avif', '.avif', '.heic']))
    expect(screen.getByText(/JPG, PNG, WebP, HEIC or AVIF/)).toBeInTheDocument()
  })
})
