import i18n from '@/i18n'
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_VEHICLE,
  type PhotoContentType,
  type PhotoUploadFile,
} from '../api/vehicle-photo.api'

const TYPE_BY_EXTENSION: Record<string, PhotoContentType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
}

/**
 * The file picker's filter. Extensions as well as types: a browser that cannot name a file's
 * type (Windows often has no mapping for HEIC) would otherwise hide it from the picker.
 */
export const PHOTO_ACCEPT = [
  ...ACCEPTED_PHOTO_TYPES,
  ...Object.keys(TYPE_BY_EXTENSION).map((ext) => `.${ext}`),
].join(',')

/**
 * The type a photo is uploaded as, or undefined when it is not one we take. A type the browser
 * reports decides; the extension only stands in when it reports none.
 */
export function photoContentType(file: Pick<File, 'name' | 'type'>): PhotoContentType | undefined {
  if ((ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type)) return file.type as PhotoContentType
  if (file.type !== '' && file.type !== 'application/octet-stream') return undefined
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return TYPE_BY_EXTENSION[extension]
}

export function describeFile(file: File): PhotoUploadFile {
  return { name: file.name, contentType: photoContentType(file) ?? file.type, sizeBytes: file.size }
}

/** Splits picked files into those to upload and a reason, naming the file, for each of the rest. */
export function screenPhotos(files: File[], remaining: number) {
  const accepted: File[] = []
  const problems: string[] = []

  for (const file of files) {
    if (!photoContentType(file)) {
      problems.push(i18n.t('vehicles:photos.unsupportedType', { name: file.name }))
    } else if (file.size > MAX_PHOTO_BYTES) {
      problems.push(i18n.t('vehicles:photos.tooLarge', { name: file.name }))
    } else if (accepted.length >= remaining) {
      problems.push(i18n.t('vehicles:photos.overLimit', { name: file.name, max: MAX_PHOTOS_PER_VEHICLE }))
    } else {
      accepted.push(file)
    }
  }
  return { accepted, problems }
}
