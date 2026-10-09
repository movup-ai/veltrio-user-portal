import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const maps: FakeMap[] = []
const markers: FakeMarker[] = []

class FakeMap {
  setCenter = vi.fn()
  setZoom = vi.fn()
  element: Element
  constructor(element: Element) {
    this.element = element
    maps.push(this)
  }
}

class FakeMarker {
  setMap = vi.fn()
  setPosition = vi.fn()
  constructor() {
    markers.push(this)
  }
}

const loadMap = vi.fn()

vi.mock('../utils/places', () => ({ loadMap: () => loadMap() }))

const { AddressMap } = await import('./AddressMap')

const MIAMI = { lat: 25.7907, lng: -80.13 }

beforeEach(() => {
  maps.length = 0
  markers.length = 0
  loadMap.mockReset().mockResolvedValue({ Map: FakeMap, Marker: FakeMarker })
})

describe('AddressMap', () => {
  it('shows the map with no marker before anything is picked', async () => {
    render(<AddressMap label="Map" />)

    await waitFor(() => expect(maps).toHaveLength(1))
    expect(maps[0].element).toBe(screen.getByRole('region', { name: 'Map' }))
    expect(markers[0].setMap).toHaveBeenLastCalledWith(null)
    // Left on the default view: there is nowhere to centre on yet.
    expect(maps[0].setCenter).not.toHaveBeenCalled()
  })

  it('centres on the coordinates and drops the marker there', async () => {
    render(<AddressMap latitude={MIAMI.lat} longitude={MIAMI.lng} label="Map" />)

    await waitFor(() => expect(maps[0]?.setCenter).toHaveBeenCalledWith(MIAMI))
    expect(markers[0].setPosition).toHaveBeenCalledWith(MIAMI)
    expect(markers[0].setMap).toHaveBeenLastCalledWith(maps[0])
    // The default view is a whole country; a pin has to be zoomed to street level.
    expect(maps[0].setZoom).toHaveBeenCalled()
  })

  it('moves the existing map when a place is picked', async () => {
    const { rerender } = render(<AddressMap label="Map" />)
    await waitFor(() => expect(maps).toHaveLength(1))

    rerender(<AddressMap latitude={MIAMI.lat} longitude={MIAMI.lng} label="Map" />)

    await waitFor(() => expect(markers[0].setPosition).toHaveBeenCalledWith(MIAMI))
    expect(maps[0].setCenter).toHaveBeenCalledWith(MIAMI)
    // A second Map would be a second billed map load for the same dialog.
    expect(maps).toHaveLength(1)
  })

  it('lifts the marker when the pin is cleared', async () => {
    const { rerender } = render(<AddressMap latitude={MIAMI.lat} longitude={MIAMI.lng} label="Map" />)
    await waitFor(() => expect(markers[0]?.setMap).toHaveBeenLastCalledWith(maps[0]))

    rerender(<AddressMap label="Map" />)

    await waitFor(() => expect(markers[0].setMap).toHaveBeenLastCalledWith(null))
  })

  it('renders nothing when the map cannot load', async () => {
    loadMap.mockRejectedValue(new Error('blocked'))
    render(<AddressMap latitude={MIAMI.lat} longitude={MIAMI.lng} label="Map" />)

    await waitFor(() => expect(screen.queryByRole('region')).not.toBeInTheDocument())
  })
})
