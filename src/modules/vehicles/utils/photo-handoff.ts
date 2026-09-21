/**
 * Carries the wizard's picked files to the details page, which uploads them once the vehicle
 * exists. A module-level map, not router state: `File`s would otherwise be cloned into history.
 */
const pending = new Map<string, File[]>()

export function handOffPhotos(vehicleId: string, files: File[]): void {
  if (files.length > 0) pending.set(vehicleId, files)
}

/** Returns the files once, then forgets them — a refresh must not re-upload. */
export function takeHandedOffPhotos(vehicleId: string): File[] {
  const files = pending.get(vehicleId)
  pending.delete(vehicleId)
  return files ?? []
}
