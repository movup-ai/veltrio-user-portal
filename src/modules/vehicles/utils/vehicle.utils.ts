import type { Row, RowActionItem } from '@/components/data-display/record-table.types'
import type { VehicleFormValues } from '../schema/vehicle.schema'
import { BILLING_BASIS_LABELS, type RateOption, type Vehicle } from '../types/vehicle.types'

/** Flattens a Vehicle's nested specs/fees into the form's flat shape — used to prefill Edit and Duplicate. */
export function valuesFromVehicle(vehicle: Vehicle): VehicleFormValues {
  return {
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    class: vehicle.class,
    color: vehicle.color,
    plate: vehicle.plate,
    vin: vehicle.vin,
    location: vehicle.location,
    status: vehicle.status,
    mileage: vehicle.mileage,
    transmission: vehicle.specs.transmission,
    fuelType: vehicle.specs.fuelType,
    seats: vehicle.specs.seats,
    doors: vehicle.specs.doors,
    topSpeedMph: vehicle.specs.topSpeedMph,
    horsepower: vehicle.specs.horsepower,
    zeroToSixtySec: vehicle.specs.zeroToSixtySec,
    cylinders: vehicle.specs.cylinders,
    description: vehicle.description ?? '',
    photos: vehicle.photos,
    rateOptions: vehicle.rateOptions,
    deposit: vehicle.fees.deposit ?? 0,
    overageRatePerMile: vehicle.fees.overageRatePerMile ?? 0,
    fuelChargeRate: vehicle.fees.fuelChargeRate,
    taxRatePct: vehicle.fees.taxRatePct,
  }
}

export function vehicleColumns() {
  return [
    { label: 'Vehicle', align: 'left' as const },
    { label: 'Plate / VIN', align: 'left' as const },
    { label: 'Location', align: 'left' as const },
    { label: 'Status', align: 'left' as const },
    { label: 'Utilization (30d)', align: 'left' as const },
    { label: 'From', align: 'right' as const },
    { label: '', align: 'right' as const },
  ]
}

export function vehicleDisplayName(v: Vehicle): string {
  return `${v.make} ${v.model}`
}

export function vehicleSubtitle(v: Vehicle): string {
  return `${v.class} · ${v.year}`
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`
}

const BASIS_SUFFIX: Record<RateOption['basis'], string> = {
  hour: '/hr',
  day: '/day',
  week: '/wk',
  month: '/mo',
  fixed: '',
}

/** The per-day rate option, used for list/stat comparisons across the fleet. */
export function dailyRateOption(v: Vehicle): RateOption | undefined {
  return v.rateOptions.find((o) => o.basis === 'day')
}

/** Headline price for list views — the daily rate when there is one, else the cheapest option. */
export function headlineRateOption(v: Vehicle): RateOption | undefined {
  return dailyRateOption(v) ?? [...v.rateOptions].sort((a, b) => a.rate - b.rate)[0]
}

export function formatRateOptionPrice(option: RateOption): string {
  return `${formatCurrency(option.rate)}${BASIS_SUFFIX[option.basis]}`
}

/** "Per day" / "Fixed · 3 days" — how the option is billed, for display. */
export function formatRateOptionBasis(option: RateOption): string {
  if (option.basis === 'fixed') {
    const unit = option.blockDurationUnit ?? 'days'
    const n = option.blockDuration ?? 0
    return `Fixed · ${n} ${n === 1 ? unit.replace(/s$/, '') : unit}`
  }
  return BILLING_BASIS_LABELS[option.basis]
}

export function formatRateOptionMileage(option: RateOption): string {
  if (option.unlimitedMileage) return 'Unlimited miles'
  if (option.includedMiles == null) return '—'
  const per = option.basis === 'fixed' ? 'total' : BILLING_BASIS_LABELS[option.basis].replace('Per ', '/')
  return `${option.includedMiles.toLocaleString('en-US')} mi ${per}`
}

function meterTone(utilization: number): string {
  if (utilization >= 0.7) return 'var(--color-success)'
  if (utilization >= 0.4) return 'var(--color-warning)'
  return 'var(--color-error)'
}

export function vehicleRow(v: Vehicle, actions: RowActionItem[]): Row {
  const pct = Math.round(v.utilization * 100)
  const headline = headlineRateOption(v)

  return {
    key: v.id,
    cells: [
      {
        kind: 'avatar',
        primary: vehicleDisplayName(v),
        secondary: vehicleSubtitle(v),
        initials: `${v.make[0]}${v.model[0]}`.toUpperCase(),
        avatarBg: 'var(--color-surface-3)',
        avatarFg: 'var(--color-fg-3)',
        avatarRadius: '8px',
        subFontMono: false,
      },
      { kind: 'stack', primary: v.plate, secondary: v.vin, weight: 500, subFontMono: true },
      { kind: 'text', primary: v.location },
      { kind: 'badge', status: v.status },
      { kind: 'meter', primary: `${pct}%`, pct: `${pct}%`, tone: meterTone(v.utilization) },
      {
        kind: 'amount',
        primary: headline ? formatRateOptionPrice(headline) : '—',
        align: 'right',
        tone: 'var(--color-foreground)',
      },
      { kind: 'actions', align: 'right', items: actions },
    ],
  }
}
