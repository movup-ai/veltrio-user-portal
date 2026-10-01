import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { VehiclePhoto } from '../types/vehicle.types'
import { VehiclePhotoEditor } from './VehiclePhotoEditor'

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

vi.mock('../api/vehicle-photo.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/vehicle-photo.api')>()),
  vehiclePhotoApi: {
    requestUploads: vi.fn(async () => [
      { photo: { id: 'p1', url: '', name: 'front.jpg' }, upload: { url: 'https://s3', fields: {} } },
    ]),
    uploadToStorage: vi.fn(async () => undefined),
    completeUpload: vi.fn(async () => ({ id: 'p1', url: '', name: 'front.jpg', status: 'processing' })),
  },
}))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:front')
})

const TARGET = { kind: 'vehicle', id: 'v1' } as const

function renderEditor(photos: VehiclePhoto[]) {
  const client = new QueryClient()
  const view = render(
    <QueryClientProvider client={client}>
      <VehiclePhotoEditor target={TARGET} photos={photos} />
    </QueryClientProvider>,
  )
  return {
    ...view,
    showPhotos: (next: VehiclePhoto[]) =>
      view.rerender(
        <QueryClientProvider client={client}>
          <VehiclePhotoEditor target={TARGET} photos={next} />
        </QueryClientProvider>,
      ),
  }
}

/** Every picture the grid is showing, by source. */
function pictures(container: HTMLElement) {
  return Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'))
}

describe('VehiclePhotoEditor', () => {
  it('keeps showing a new photo from the moment it is picked until its thumbnail is ready', async () => {
    // The tile used to vanish when its upload finished, come back blank while the server
    // processed it, then pop in: the grid blinked once per photo.
    const user = userEvent.setup({ delay: null })
    const { container, showPhotos } = renderEditor([])

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, [
      new File(['x'], 'front.jpg', { type: 'image/jpeg' }),
    ])

    // Uploaded, and the vehicle not reloaded yet: still on screen.
    await waitFor(() => expect(pictures(container)).toEqual(['blob:front']))

    // Listed by the server but still processing: the same picture, not a blank tile.
    showPhotos([{ id: 'p1', url: '', name: 'front.jpg', status: 'processing' }])
    expect(pictures(container)).toEqual(['blob:front'])
    expect(screen.getByRole('status', { name: 'Processing' })).toBeInTheDocument()

    // Ready: the thumbnail lands over the preview, so nothing goes blank while it loads.
    showPhotos([
      {
        id: 'p1',
        url: 'https://cdn/medium.webp',
        name: 'front.jpg',
        status: 'ready',
        variants: [{ size: 'thumbnail', width: 400, height: 300, url: 'https://cdn/thumb.webp' }],
      },
    ])
    expect(pictures(container)).toEqual(['blob:front', 'https://cdn/thumb.webp'])
    expect(screen.queryByRole('status', { name: 'Processing' })).not.toBeInTheDocument()
  })
})
