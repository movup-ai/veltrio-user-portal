export { vehicleApi } from './api/vehicle.api'
export { vehicleKeys, useVehicles, useVehicle, useCreateVehicle, useUpdateVehicle, useArchiveVehicle } from './hooks/use-vehicles'
export { vehicleFormSchema, rateOptionSchema, type VehicleFormValues, type RateOptionValues } from './schema/vehicle.schema'
export { RateOptionsEditor } from './components/RateOptionsEditor'
export {
  vehicleColumns,
  vehicleRow,
  vehicleDisplayName,
  vehicleSubtitle,
  formatCurrency,
  dailyRateOption,
  headlineRateOption,
  formatRateOptionBasis,
  formatRateOptionMileage,
  formatRateOptionPrice,
} from './utils/vehicle.utils'
export { VEHICLE_STATUSES, VEHICLE_TYPES, BILLING_BASES, DURATION_UNITS } from './types/vehicle.types'
export type {
  Vehicle,
  VehicleStatus,
  VehicleType,
  VehicleInput,
  VehicleListParams,
  RateOption,
  BillingBasis,
  DurationUnit,
  VehicleFees,
} from './types/vehicle.types'
