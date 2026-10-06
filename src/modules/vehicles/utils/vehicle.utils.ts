import type { TFunction } from 'i18next'
import i18n from '@/i18n'
import type { Row, RowActionItem } from '@/components/data-display/record-table.types'
import { formatCurrency, formatNumberIn, currentLanguage } from '@/i18n/formatters'
import { translateDomain, translateDurationUnit } from '@/i18n/domain'
import { DEFAULT_BILLABLE_HOURS_PER_DAY } from '../constants/rate-plan.constants'
import type { VehicleFormValues } from '../schema/vehicle.schema'
import type { VehicleDraft } from '../types/vehicle-draft.types'
import type { RateOption, Vehicle, VehicleInput, VehiclePhoto } from '../types/vehicle.types'

export { formatCurrency }

/**
 * Strips the server-assigned keys so an existing vehicle can be sent straight back through
 * update/create. Preferred over hand-listing fields at the call site — a hand-written payload
 * silently drops any field later added to Vehicle, wiping it on save.
 */
export function vehicleToInput({
  id: _id,
  createdAt: _createdAt,
  utilization: _utilization,
  uri: _uri,
  ...input
}: Vehicle): VehicleInput {
  return input
}

/**
 * Presents a draft as a Vehicle so the Drafts tab can reuse the fleet table. Display only — the
 * `id` is the draft's, not a vehicle's, and most fields may be blank. The blank-safe helpers
 * below (vehicleDisplayName, vehicleSubtitle, vehicleInitials) exist for exactly this.
 */
export function draftAsVehicle(draft: VehicleDraft): Vehicle {
  const values = draft.payload

  return {
    id: draft.id,
    make: values.make ?? '',
    model: values.model ?? '',
    year: values.year as number,
    vehicleType: values.vehicleType as Vehicle['vehicleType'],
    color: values.color ?? '',
    plate: values.plate ?? '',
    vin: values.vin ?? '',
    // A draft has no public URL until it is published and the API assigns one.
    uri: '',
    location: values.location ?? '',
    status: values.status ?? 'Available',
    mileage: values.mileage ?? 0,
    utilization: 0,
    description: values.description,
    // From the draft record, not its payload: photos are uploaded against the draft and the
    // payload deliberately carries none (it is JSON with a 64 KB cap).
    photos: draft.photos,
    rateOptions: values.rateOptions ?? [],
    discountTiers: (values.discountTiers ?? []).map(({ minDays, percentOff }) => ({ minDays, percentOff })),
    billableHoursPerDay: values.billableHoursPerDay ?? DEFAULT_BILLABLE_HOURS_PER_DAY,
    fees: {
      deposit: values.deposit,
      overageRatePerMile: values.overageRatePerMile,
      fuelChargeRate: values.fuelChargeRate,
      taxRatePct: values.taxRatePct,
    },
    specs: {
      transmission: values.transmission ?? 'Automatic',
      fuelType: values.fuelType ?? 'Petrol',
      seats: values.seats ?? 0,
      doors: values.doors ?? 0,
    },
    features: values.features ?? [],
    createdAt: draft.createdAt,
    isDraft: true,
  }
}

/** Flattens a Vehicle's nested specs/fees into the form's flat shape — used to prefill Edit and Duplicate. */
export function valuesFromVehicle(vehicle: Vehicle): VehicleFormValues {
  return {
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    vehicleType: vehicle.vehicleType,
    color: vehicle.color,
    plate: vehicle.plate,
    vin: vehicle.vin,
    location: vehicle.location,
    // Archiving is its own action, so the form has no such option — an archived vehicle opened
    // for editing shows the status it would return to.
    status: vehicle.status === 'Archived' ? 'Available' : vehicle.status,
    mileage: vehicle.mileage,
    transmission: vehicle.specs.transmission,
    fuelType: vehicle.specs.fuelType,
    seats: vehicle.specs.seats,
    doors: vehicle.specs.doors,
    features: vehicle.features ?? [],
    description: vehicle.description ?? '',
    photos: vehicle.photos,
    rateOptions: vehicle.rateOptions,
    // Thresholds are unique on a saved vehicle, so they key the editor's rows.
    discountTiers: vehicle.discountTiers.map((tier) => ({ id: `tier-${tier.minDays}`, ...tier })),
    billableHoursPerDay: vehicle.billableHoursPerDay,
    deposit: vehicle.fees.deposit ?? 0,
    overageRatePerMile: vehicle.fees.overageRatePerMile ?? 0,
    fuelChargeRate: vehicle.fees.fuelChargeRate,
    taxRatePct: vehicle.fees.taxRatePct,
  }
}

export function vehicleColumns(t: TFunction<'vehicles'>) {
  return [
    { label: t('columns.vehicle'), align: 'left' as const },
    { label: t('columns.plateVin'), align: 'left' as const },
    { label: t('columns.location'), align: 'left' as const },
    { label: t('columns.status'), align: 'left' as const },
    { label: t('columns.utilization30d'), align: 'left' as const },
    { label: t('columns.trips'), align: 'right' as const },
    { label: t('columns.dailyRate'), align: 'right' as const },
    { label: '', align: 'right' as const },
  ]
}

/** Drafts can be saved before make/model are filled in, so fall back rather than render a blank cell. */
export function vehicleDisplayName(v: Vehicle): string {
  return `${v.make ?? ''} ${v.model ?? ''}`.trim() || i18n.t('vehicles:untitledVehicle')
}

/** Two-letter avatar initials, blank-safe for the same reason as vehicleDisplayName. */
function vehicleInitials(v: Vehicle): string {
  const letters = `${v.make?.[0] ?? ''}${v.model?.[0] ?? ''}`.trim()
  return letters ? letters.toUpperCase() : '—'
}

/** "Sedan · 2024" — the vehicle type is translated, the year is not. Either part may be missing on a draft. */
export function vehicleSubtitle(v: Vehicle): string {
  return [
    v.vehicleType ? translateDomain('vehicleType', v.vehicleType) : '',
    Number.isFinite(v.year) ? String(v.year) : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * `srcSet` over every size the backend rendered, so the browser downloads the one it needs.
 * Undefined for a locally picked file, which has only its data URL.
 */
export function photoSrcSet(photo: VehiclePhoto): string | undefined {
  return photo.variants?.map((v) => `${v.url} ${v.width}w`).join(', ')
}

/** Smallest rendered size, for thumbnails. Falls back to whatever url the photo has. */
export function photoThumbnail(photo: VehiclePhoto): string {
  return photo.variants?.find((v) => v.size === 'thumbnail')?.url ?? photo.url
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
  return `${formatCurrency(option.rate)}${translateDomain('billingBasisSuffix', option.basis)}`
}

/** "Per day" / "Fixed · 3 days" — how the option is billed, for display. */
export function formatRateOptionBasis(option: RateOption, t: TFunction<'vehicles'>): string {
  if (option.basis === 'fixed') {
    const unit = option.blockDurationUnit ?? 'days'
    const count = option.blockDuration ?? 0
    return t('rateOptions.fixedBasis', { count, unit: translateDurationUnit(unit, count) })
  }
  return translateDomain('billingBasis', option.basis)
}

interface PlanLineName {
  label: string
  count: number
  /** Set on an automatic capped day of an hourly rate. */
  cappedHours?: number
}

/** "Hourly (8 h/day cap)" for an automatic capped day; the option's own label otherwise. */
export function rateLineLabel(line: Omit<PlanLineName, 'count'>, t: TFunction<'vehicles'>): string {
  return line.cappedHours
    ? t('ratePlan.cappedLabel', { label: line.label, hours: line.cappedHours })
    : line.label
}

/** "Weekly + Daily × 3" — the rates a plan combines, longest unit first. */
export function formatPlanLines(lines: PlanLineName[], t: TFunction<'vehicles'>): string {
  return lines
    .map((line) => {
      const label = rateLineLabel(line, t)
      return line.count > 1 ? t('ratePlan.lineTimes', { label, count: line.count }) : label
    })
    .join(' + ')
}

/** Plan lines in the shape the formatters take. */
export function planLineNames(
  lines: { option: RateOption; count: number; cappedHours?: number }[],
): PlanLineName[] {
  return lines.map((l) => ({ label: l.option.label, count: l.count, cappedHours: l.cappedHours }))
}

export function formatRateOptionMileage(option: RateOption, t: TFunction<'vehicles'>): string {
  if (option.unlimitedMileage) return t('rateOptions.unlimitedMiles')
  if (option.includedMiles == null) return '—'
  const per = translateDomain('billingBasisPer', option.basis)
  return `${formatNumberIn(currentLanguage(), option.includedMiles)} mi ${per}`
}

function meterTone(utilization: number): string {
  if (utilization >= 0.7) return 'var(--color-success)'
  if (utilization >= 0.4) return 'var(--color-warning)'
  return 'var(--color-error)'
}

export function vehicleRow(v: Vehicle, tripsCount: number | undefined, actions: RowActionItem[]): Row {
  const pct = Math.round(v.utilization * 100)
  const daily = dailyRateOption(v)

  return {
    key: v.id,
    cells: [
      {
        kind: 'avatar',
        primary: vehicleDisplayName(v),
        secondary: vehicleSubtitle(v),
        initials: vehicleInitials(v),
        // Cover photo, falling back to initials while it processes or when there is none.
        imageUrl: v.photos[0] ? photoThumbnail(v.photos[0]) || undefined : undefined,
        avatarSize: 46,
        avatarBg: 'var(--color-surface-3)',
        avatarFg: 'var(--color-fg-3)',
        avatarRadius: '8px',
        subFontMono: false,
      },
      { kind: 'stack', primary: v.plate, secondary: v.vin, weight: 500, subFontMono: true },
      { kind: 'text', primary: v.location },
      { kind: 'badge', status: v.isDraft ? 'Draft' : v.status },
      { kind: 'meter', primary: `${pct}%`, pct: `${pct}%`, tone: meterTone(v.utilization) },
      { kind: 'text', primary: tripsCount === undefined ? '—' : String(tripsCount), align: 'right' },
      {
        kind: 'amount',
        primary: daily ? formatCurrency(daily.rate) : '—',
        align: 'right',
        tone: 'var(--color-foreground)',
      },
      { kind: 'actions', align: 'right', items: actions },
    ],
  }
}
