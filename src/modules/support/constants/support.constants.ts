/** The API's allowlist: anything else is a 422 before a byte is uploaded. */
export const ACCEPTED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'application/pdf',
  'text/plain',
  'text/csv',
] as const

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENTS_PER_MESSAGE = 5

/** The API's limits, so a long subject or message is refused here rather than after sending. */
export const MAX_SUBJECT_LENGTH = 200
export const MAX_MESSAGE_LENGTH = 10_000
