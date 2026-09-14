/** [name, subtitle, plate, vin, location, status, dailyRate, utilization (0–1)] */
export type VehicleTuple = [
  name: string,
  subtitle: string,
  plate: string,
  vin: string,
  location: string,
  status: string,
  dailyRate: string,
  utilization: number,
]
