import { useEffect, useRef, useState } from 'react'
import { loadMap } from '../utils/places'

interface Props {
  /** Set together or not at all. Without them the map shows its default view and no marker. */
  latitude?: number
  longitude?: number
  /** Names the map for assistive tech; the tiles carry no text of their own. */
  label: string
}

const PIN_ZOOM = 15
// The contiguous United States: there is no address to centre on until one is picked.
const DEFAULT_VIEW = { center: { lat: 39.5, lng: -98.35 }, zoom: 3 }

/**
 * Shows where a picked address landed, so a wrong match is seen before the branch is saved.
 * Renders nothing if the map cannot load: the coordinates are stored either way.
 */
export function AddressMap({ latitude, longitude, label }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<{ map: google.maps.Map; marker: google.maps.Marker }>(undefined)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const position =
      latitude !== undefined && longitude !== undefined ? { lat: latitude, lng: longitude } : undefined

    void (async () => {
      try {
        const { Map, Marker } = await loadMap()
        if (cancelled || !container.current) return

        // Built once and then moved: Google bills every new Map as a map load.
        view.current ??= {
          map: new Map(container.current, {
            ...DEFAULT_VIEW,
            disableDefaultUI: true,
            zoomControl: true,
          }),
          marker: new Marker(),
        }
        const { map, marker } = view.current
        marker.setMap(position ? map : null)
        if (!position) return

        marker.setPosition(position)
        map.setCenter(position)
        map.setZoom(PIN_ZOOM)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [latitude, longitude])

  if (failed) return null

  return (
    <div
      ref={container}
      role="region"
      aria-label={label}
      // Isolated: Google's controls carry huge z-indexes that would otherwise paint over the
      // suggestion list that drops down across the map.
      className="border-border isolate h-44 w-full overflow-hidden rounded-md border"
    />
  )
}
