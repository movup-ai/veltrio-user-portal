import * as React from 'react'
import type { ToastAction } from './toast'

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 5000

interface ToastRecord {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactElement<typeof ToastAction>
  variant?: 'default' | 'success' | 'error'
  open: boolean
}

type Listener = (toasts: ToastRecord[]) => void

let toasts: ToastRecord[] = []
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener(toasts)
}

function dismiss(id: string) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, open: false } : t))
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, 200)
}

export type ToastInput = Omit<ToastRecord, 'id' | 'open'>

export function toast(input: ToastInput) {
  const id = crypto.randomUUID()
  toasts = [{ ...input, id, open: true }, ...toasts].slice(0, TOAST_LIMIT)
  emit()
  const timeout = setTimeout(() => dismiss(id), TOAST_REMOVE_DELAY)
  return { id, dismiss: () => (clearTimeout(timeout), dismiss(id)) }
}

export function useToast() {
  const [state, setState] = React.useState(toasts)

  React.useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  return { toasts: state, toast, dismiss }
}
