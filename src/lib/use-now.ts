import { useEffect, useState } from 'react'

/**
 * The clock, re-read every `intervalMs`: for what is derived from the time on a page left open,
 * such as a rental running late. Rendering `Date.now()` once would freeze it at page load.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
