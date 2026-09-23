import { useEffect, useState } from 'react'

/**
 * Trails `value` by `delayMs`, so a value that drives a request settles before it fires.
 *
 * Typing in a search box would otherwise send one request per keystroke; with this, the last
 * keystroke of a burst is the only one that reaches the server.
 */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return settled
}
