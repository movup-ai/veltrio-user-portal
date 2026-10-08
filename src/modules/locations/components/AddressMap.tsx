import { useEffect, useRef, useState } from 'react'
import { loadMap } from '../utils/places'

interface Props {
  latitude: number
  longitude: number
  /** Names the map for assistive tech; the tiles carry no text of their own. */
  label: string
}

const ZOOM = 15

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
    const position = { lat: latitude, lng: longitude }

    void (async () => {
      try {
        const { Map, Marker } = await loadMap()
        if (cancelled || !container.current) return

        if (view.current) {
          // Moved rather than rebuilt: Google bills every new Map as a map load.
          view.current.map.setCenter(position)
          view.current.marker.setPosition(position)
          return
        }
        const map = new Map(container.current, {
          center: position,
          zoom: ZOOM,
          disableDefaultUI: true,
          zoomControl: true,
        })
        view.current = { map, marker: new Marker({ map, position }) }
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
      className="border-border h-44 w-full overflow-hidden rounded-md border"
    />
  )
}
