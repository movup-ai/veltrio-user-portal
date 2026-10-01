import { describe, expect, it } from 'vitest'
import type { PhotoUpload } from '../hooks/use-photo-upload'
import { previewsByPhoto, unlistedUploads } from './photo-tiles'

function upload(overrides: Partial<PhotoUpload>): PhotoUpload {
  return { key: 'k', name: 'a.jpg', previewUrl: 'blob:a', phase: 'uploading', progress: 0, ...overrides }
}

describe('unlistedUploads', () => {
  it('keeps a finished upload until the photo list holds it', () => {
    const done = upload({ key: 'done', photoId: 'p1', phase: 'done' })

    expect(unlistedUploads([done], [])).toEqual([done])
    expect(unlistedUploads([done], [{ id: 'p1' }])).toEqual([])
  })

  it('keeps uploads not yet given a photo, and failed ones', () => {
    const queued = upload({ key: 'queued', phase: 'queued' })
    const failed = upload({ key: 'failed', phase: 'failed', error: 'x' })

    expect(unlistedUploads([queued, failed], [{ id: 'p1' }])).toEqual([queued, failed])
  })
})

describe('previewsByPhoto', () => {
  it('maps each uploaded photo to its local preview', () => {
    const previews = previewsByPhoto([
      upload({ photoId: 'p1', previewUrl: 'blob:1' }),
      upload({ previewUrl: 'blob:2' }),
    ])

    expect([...previews]).toEqual([['p1', 'blob:1']])
  })
})
