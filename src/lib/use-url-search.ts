import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * A list's search box, started from `?search=` so the header search can open the list on what it
 * found. A later `?search=` replaces what was typed: the header used again from the same list.
 */
export function useUrlSearch(): [string, (value: string) => void] {
  const [params] = useSearchParams()
  const fromUrl = params.get('search')
  const [search, setSearch] = useState(fromUrl ?? '')
  const [seen, setSeen] = useState(fromUrl)
  if (fromUrl !== seen) {
    setSeen(fromUrl)
    if (fromUrl !== null) setSearch(fromUrl)
  }
  return [search, setSearch]
}
