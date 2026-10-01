import { describe, expect, it, vi } from 'vitest'
import '@/i18n'

const requestUploads = vi.fn()

vi.mock('../api/vehicle-photo.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/vehicle-photo.api')>()),
  vehiclePhotoApi: { requestUploads: (...args: unknown[]) => requestUploads(...args) },
}))

const { uploadPhotos } = await import('./use-photo-upload')

describe('uploadPhotos', () => {
  it('reports why each refused file was refused, for the first-save toast to name', async () => {
    // Photos picked before the draft existed are not on screen afterwards, so a bare
    // "could not be uploaded" left no way to tell which one, or why.
    const result = await uploadPhotos({ kind: 'draft', id: 'd1' }, [
      new File(['b'], 'logo.gif', { type: 'image/gif' }),
    ])

    expect(result).toEqual({ uploaded: 0, failed: 1, problems: ['logo.gif is not a supported image type'] })
    expect(requestUploads).not.toHaveBeenCalled()
  })
})
