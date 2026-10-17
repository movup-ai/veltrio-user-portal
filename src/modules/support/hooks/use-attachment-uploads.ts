import { useCallback, useRef, useState } from 'react'
import { normalizeApiError } from '@/services/api/errors'
import { supportApi } from '../api/support.api'
import type { TicketAttachment } from '../types/support.types'
import { attachmentProblem, type AttachmentProblem } from '../utils/support.utils'

export interface PendingAttachment {
  key: number
  file: File
  status: 'uploading' | 'ready' | 'failed'
  progress: number
  attachment?: TicketAttachment
  error?: string
}

/**
 * Files picked for a message still being written. Each uploads the moment it is picked, so
 * sending waits only on whatever is still in flight rather than on every file.
 */
export function useAttachmentUploads() {
  const [items, setItems] = useState<PendingAttachment[]>([])
  const [refused, setRefused] = useState<{ name: string; problem: AttachmentProblem }>()
  const nextKey = useRef(0)

  const update = useCallback((key: number, patch: Partial<PendingAttachment>) => {
    // A file removed while uploading has no row left, so its late result changes nothing.
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }, [])

  const add = (files: File[]) => {
    setRefused(undefined)
    // Failed files do not count: they will not be sent, and removing one should not be needed to pick another.
    let picked = items.filter((item) => item.status !== 'failed').length
    for (const file of files) {
      const problem = attachmentProblem(file, picked)
      if (problem) {
        setRefused({ name: file.name, problem })
        continue
      }
      picked += 1
      const key = nextKey.current++
      setItems((current) => [...current, { key, file, status: 'uploading', progress: 0 }])
      supportApi
        .uploadAttachment(file, (progress) => update(key, { progress }))
        .then((attachment) => update(key, { status: 'ready', attachment, progress: 100 }))
        .catch((error: unknown) => update(key, { status: 'failed', error: normalizeApiError(error).message }))
    }
  }

  const remove = (key: number) => setItems((current) => current.filter((item) => item.key !== key))

  const reset = () => {
    setItems([])
    setRefused(undefined)
  }

  return {
    items,
    refused,
    add,
    remove,
    reset,
    ids: items.flatMap((item) => (item.attachment ? [item.attachment.id] : [])),
    /** Sending now would drop a file the writer believes is attached. */
    pending: items.some((item) => item.status !== 'ready'),
  }
}

export type AttachmentUploads = ReturnType<typeof useAttachmentUploads>
