import { useEffect, useRef, useState } from 'react'
import type { VehicleFormValues } from '../schema/vehicle.schema'

const PREFIX = 'veltrio.vehicle-draft.'
const AUTOSAVE_DELAY_MS = 600

export interface VehicleDraft {
  values: VehicleFormValues
  step: number
  savedAt: string
}

export function vehicleDraftKey(vehicleId: string | undefined): string {
  return `${PREFIX}${vehicleId ?? 'new'}`
}

export function readVehicleDraft(key: string): VehicleDraft | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as VehicleDraft
  } catch {
    return null
  }
}

export function clearVehicleDraft(key: string): void {
  localStorage.removeItem(key)
}

export function writeVehicleDraft(key: string, values: VehicleFormValues, step: number): string {
  const savedAt = new Date().toISOString()
  try {
    localStorage.setItem(key, JSON.stringify({ values, step, savedAt } satisfies VehicleDraft))
  } catch {
    // Storage full/unavailable — draft autosave is best-effort, fail silently.
  }
  return savedAt
}

/** Debounced autosave to localStorage so in-progress vehicle forms survive a crashed tab or accidental close. */
export function useVehicleDraftAutosave(key: string, values: VehicleFormValues, step: number, enabled: boolean) {
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const valuesJson = JSON.stringify(values)

  useEffect(() => {
    if (!enabled) return
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setLastSavedAt(writeVehicleDraft(key, JSON.parse(valuesJson), step))
    }, AUTOSAVE_DELAY_MS)

    return () => clearTimeout(timeoutRef.current)
  }, [key, step, enabled, valuesJson])

  return lastSavedAt
}
