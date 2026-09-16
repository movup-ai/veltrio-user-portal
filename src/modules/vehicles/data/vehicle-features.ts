import { AirVent, Bluetooth, Camera, Navigation, Radar, Smartphone, Sun, Usb, type LucideIcon } from 'lucide-react'
import type { VehicleFeature } from '../types/vehicle.types'

/**
 * Icon per feature. Kept out of vehicle.types.ts so the type module stays free of UI imports —
 * labels and descriptions live in `vehicles:features.<key>`.
 */
export const VEHICLE_FEATURE_ICONS: Record<VehicleFeature, LucideIcon> = {
  airConditioning: AirVent,
  gpsNavigation: Navigation,
  bluetoothAudio: Bluetooth,
  usbCharging: Usb,
  sunroof: Sun,
  driverAssist: Radar,
  appleCarPlay: Smartphone,
  rearViewCamera: Camera,
}
