import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/services/api/client'
import { uploadConditionPhoto } from './booking-condition-photo.api'

const toStorage = vi.fn<(upload: unknown, file: File) => Promise<void>>()

vi.mock('@/services/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))
vi.mock('@/modules/vehicles/api/vehicle-photo.api', () => ({
  vehiclePhotoApi: { uploadToStorage: (upload: unknown, file: File) => toStorage(upload, file) },
}))

const post = vi.mocked(apiClient.post)
const remove = vi.mocked(apiClient.delete)
const PHOTOS = '/bookings/BK-10001/condition-photos'
const UPLOAD = { url: 'https://storage.test', fields: { key: 'k' }, expiresAt: '2026-10-07T12:00:00Z' }
const file = new File(['photo'], 'front.jpg', { type: 'image/jpeg' })

describe('uploadConditionPhoto', () => {
  beforeEach(() => {
    for (const mock of [post, remove, toStorage]) mock.mockReset()
    post.mockResolvedValueOnce({ data: { id: 'p1', upload: UPLOAD } })
    remove.mockResolvedValue({ data: undefined })
  })

  it('reserves the photo, sends the file straight to storage, then confirms it', async () => {
    toStorage.mockResolvedValue()
    post.mockResolvedValueOnce({
      data: { id: 'p1', stage: 'pickup', name: 'front.jpg', url: 'https://x/p1' },
    })

    const photo = await uploadConditionPhoto('BK-10001', 'pickup', file)

    expect(post).toHaveBeenNthCalledWith(1, PHOTOS, {
      stage: 'pickup',
      name: 'front.jpg',
      contentType: 'image/jpeg',
      sizeBytes: file.size,
    })
    expect(toStorage).toHaveBeenCalledWith(UPLOAD, file)
    expect(post).toHaveBeenNthCalledWith(2, `${PHOTOS}/p1/complete`)
    expect(photo).toEqual({ id: 'p1', stage: 'pickup', name: 'front.jpg', url: 'https://x/p1' })
  })

  it('gives the reserved photo back when the file never reaches storage', async () => {
    // Left reserved, it counts towards the handover's photo limit until the API expires it.
    toStorage.mockRejectedValue(new Error('Upload failed'))

    await expect(uploadConditionPhoto('BK-10001', 'pickup', file)).rejects.toThrow('Upload failed')

    expect(remove).toHaveBeenCalledWith(`${PHOTOS}/p1`)
  })
})
