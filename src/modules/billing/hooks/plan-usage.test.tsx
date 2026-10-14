import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'
import {
  useCreateLocation,
  useDeleteLocation,
  useUpdateLocation,
} from '@/modules/locations/hooks/use-locations'
import type { Location, LocationInput } from '@/modules/locations/types/location.types'
import { usePublishVehicleDraft } from '@/modules/vehicles/hooks/use-vehicle-drafts'
import {
  useArchiveVehicle,
  useCreateVehicle,
  useRestoreVehicle,
  useUpdateVehicle,
} from '@/modules/vehicles/hooks/use-vehicles'
import type { Vehicle, VehicleInput } from '@/modules/vehicles/types/vehicle.types'
import { billingKeys } from './use-billing'

const VEHICLE = { id: 'v1', make: 'Toyota', model: 'Camry' } as Vehicle
const LOCATION = { id: 'l1', name: 'Tampa' } as Location

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('@/modules/vehicles/api/vehicle.api', () => ({
  vehicleApi: {
    create: () => Promise.resolve(VEHICLE),
    update: () => Promise.resolve(VEHICLE),
    archive: () => Promise.resolve(),
    restore: () => Promise.resolve(),
  },
}))
vi.mock('@/modules/vehicles/api/vehicle-draft.api', () => ({
  vehicleDraftApi: { publish: () => Promise.resolve(VEHICLE) },
}))
vi.mock('@/modules/locations/api/location.api', () => ({
  locationApi: {
    create: () => Promise.resolve(LOCATION),
    update: () => Promise.resolve(LOCATION),
    remove: () => Promise.resolve(),
  },
}))

/** Runs one mutation and says whether the Billing tab's counts were marked to be read again. */
async function refreshesUsage<T>(useHook: () => { mutateAsync: (arg: T) => Promise<unknown> }, arg: T) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(billingKeys.billing, { vehicles: 5, branches: 1 })
  const { result } = renderHook(useHook, {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  })
  await act(() => result.current.mutateAsync(arg))
  return queryClient.getQueryState(billingKeys.billing)?.isInvalidated
}

describe('the plan usage on the Billing tab', () => {
  // The app keeps answers fresh for 30 seconds: without this, a vehicle archived to fit a
  // smaller plan still counted there, and that plan's Downgrade stayed refused.
  it('is read again after the fleet changes', async () => {
    expect(await refreshesUsage(useCreateVehicle, {} as VehicleInput)).toBe(true)
    expect(await refreshesUsage(() => useUpdateVehicle('v1'), {} as VehicleInput)).toBe(true)
    expect(await refreshesUsage(useArchiveVehicle, VEHICLE)).toBe(true)
    expect(await refreshesUsage(useRestoreVehicle, VEHICLE)).toBe(true)
    expect(await refreshesUsage(usePublishVehicleDraft, { id: 'd1', input: {} as VehicleInput })).toBe(true)
  })

  it('is read again after a branch is added or removed', async () => {
    expect(await refreshesUsage(useCreateLocation, {} as LocationInput)).toBe(true)
    expect(await refreshesUsage(useDeleteLocation, LOCATION)).toBe(true)
    expect(await refreshesUsage(useUpdateLocation, { id: 'l1', input: {} as LocationInput })).toBe(true)
  })
})
