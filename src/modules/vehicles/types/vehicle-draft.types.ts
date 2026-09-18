import type { VehicleFormValues } from '../schema/vehicle.schema'
import type { VehiclePhoto } from './vehicle.types'

/**
 * A saved "add vehicle" wizard. The API stores it opaquely and never validates it as a vehicle —
 * that is the point: a draft exists precisely because the required fields aren't filled in yet.
 * Every field may therefore be missing, blank or stale; run it through `sanitizeFormValues`
 * before handing it to the form.
 */
export type VehicleDraftPayload = Partial<VehicleFormValues>

export interface VehicleDraft {
  id: string
  payload: VehicleDraftPayload
  /** Uploaded while the wizard was open; the API moves them to the vehicle on publish. */
  photos: VehiclePhoto[]
  createdAt: string
  updatedAt: string
}
