import { describe, expect, it } from 'vitest'
import '@/i18n'
import { PHOTO_ACCEPT, describeFile, photoContentType, screenPhotos } from './photo-files'

function file(name: string, type: string, size = 1024) {
  return new File([new Uint8Array(size)], name, { type })
}

describe('photoContentType', () => {
  it('takes AVIF, which the picker and the upload both used to refuse', () => {
    expect(photoContentType(file('car.avif', 'image/avif'))).toBe('image/avif')
  })

  it('falls back to the extension when the browser reports no type', () => {
    // Windows often has no mapping for HEIC, so an iPhone photo arrives typed "".
    expect(photoContentType(file('IMG_0001.HEIC', ''))).toBe('image/heic')
    expect(photoContentType(file('car.avif', 'application/octet-stream'))).toBe('image/avif')
  })

  it('lets a reported type decide over the name', () => {
    expect(photoContentType(file('renamed.jpg', 'image/gif'))).toBeUndefined()
  })
})

describe('PHOTO_ACCEPT', () => {
  it('lists types and extensions, so the picker shows AVIF and untyped HEIC files', () => {
    const accepted = PHOTO_ACCEPT.split(',')
    expect(accepted).toEqual(expect.arrayContaining(['image/avif', '.avif', '.heic', '.jpg']))
  })
})

describe('describeFile', () => {
  it('uploads an untyped file as the type its extension names', () => {
    expect(describeFile(file('IMG_0001.HEIC', '')).contentType).toBe('image/heic')
  })
})

describe('screenPhotos', () => {
  it('keeps supported photos and names each file it refuses', () => {
    const { accepted, problems } = screenPhotos(
      [
        file('front.avif', 'image/avif'),
        file('logo.gif', 'image/gif'),
        file('huge.jpg', 'image/jpeg', 16 * 1024 * 1024),
      ],
      20,
    )

    expect(accepted.map((f) => f.name)).toEqual(['front.avif'])
    expect(problems).toEqual(['logo.gif is not a supported image type', 'huge.jpg is larger than 15 MB'])
  })

  it('refuses what would go past the photo limit', () => {
    const { accepted, problems } = screenPhotos([file('a.jpg', 'image/jpeg'), file('b.jpg', 'image/jpeg')], 1)

    expect(accepted.map((f) => f.name)).toEqual(['a.jpg'])
    expect(problems).toEqual(['b.jpg skipped — a vehicle can have at most 20 photos'])
  })
})
