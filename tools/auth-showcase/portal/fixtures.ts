import type { Billing } from '@/modules/billing/types/billing.types'
import {
  toActivityEvent,
  toBooking,
  toVerification,
  type BookingActivityWire,
  type BookingWire,
  type VerificationWire,
} from '@/modules/bookings/api/booking.mapper'
import type { Booking, BookingStats, BookingVerification } from '@/modules/bookings/types/booking.types'
import type { AgreementTemplateSummary } from '@/modules/contracts/types/agreement-template.types'
import type { BookingContract } from '@/modules/contracts/types/booking-contract.types'
import type { Location } from '@/modules/locations/types/location.types'
import type { BookingExtensions } from '@/modules/payments/types/booking-extension.types'
import type { BookingPayments, CancellationQuote } from '@/modules/payments/types/booking-payment.types'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import type { MeResponse } from '@/services/auth/auth.api'
import type { OrganizationMembership } from '@/types/user'
import { ROLE_PERMISSIONS } from '@/utils/permissions'
import {
  BRANCH,
  COMPANY,
  EXTRA_DRIVER,
  FLEET,
  HERO_REFERENCE,
  PHOTO_SIZES,
  RENTERS,
  unsplashUrl,
  type FleetCar,
  type Renter,
} from '../shared/sunstate.ts'

// Labels the company typed itself (rate names, fees, templates) follow the capture's language.
const spanish = new URLSearchParams(window.location.search).get('lang') === 'es'
const say = (en: string, es: string) => (spanish ? es : en)
const DAILY = say('Daily', 'Diaria')

/** An instant in October 2026 on Miami's clock (EDT, UTC-4 until 1 November). */
function et(day: number, hour: number, minute = 0): string {
  return new Date(Date.UTC(2026, 9, day, hour + 4, minute)).toISOString()
}

const car = (id: string): FleetCar => {
  const found = FLEET.find((c) => c.id === id)
  if (!found) throw new Error(`No car ${id}`)
  return found
}

// --- App frame -----------------------------------------------------------------------------

export const membership: OrganizationMembership = {
  organizationId: COMPANY.id,
  organizationName: COMPANY.name,
  subdomain: COMPANY.subdomain,
  currency: COMPANY.currency,
  timezone: COMPANY.timezone,
  role: 'owner',
  permissions: ROLE_PERMISSIONS.owner,
}

export const me: MeResponse = {
  user: { id: COMPANY.owner.id, email: COMPANY.owner.email, fullName: COMPANY.owner.fullName },
  membership: {
    tenantId: COMPANY.id,
    tenantName: COMPANY.name,
    subdomain: COMPANY.subdomain,
    currency: COMPANY.currency,
    timezone: COMPANY.timezone,
    role: 'owner',
  },
}

export const billing: Billing = {
  enabled: true,
  active: true,
  plan: 'growth',
  interval: 'month',
  status: 'active',
  periodEnd: '2026-11-02T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  trialAvailable: false,
  trialDays: 14,
  vehicles: FLEET.length,
  branches: 1,
  maxVehicles: 50,
  maxBranches: 3,
  currency: 'USD',
  yearlyDiscountPercent: 16,
  plans: [
    { plan: 'starter', maxVehicles: 10, maxBranches: 1, monthly: 39, yearly: 399 },
    { plan: 'growth', maxVehicles: 50, maxBranches: 3, monthly: 99, yearly: 999 },
    { plan: 'pro', maxVehicles: 200, maxBranches: 10, monthly: 199, yearly: 1999 },
    { plan: 'enterprise' },
  ],
  credits: {
    balance: 42,
    costs: { background: 2, insurance: 5 },
    packs: [
      { key: 'pack_30', credits: 30, price: 45 },
      { key: 'pack_60', credits: 60, price: 80 },
      { key: 'pack_150', credits: 150, price: 180 },
    ],
    lowBalance: 10,
  },
}

// --- Fleet and branch ----------------------------------------------------------------------

function toPortalVehicle(c: FleetCar): Vehicle {
  return {
    id: c.id,
    make: c.make,
    model: c.model,
    year: c.year,
    vehicleType: c.portalType,
    color: c.color,
    plate: c.plate,
    vin: c.vin,
    uri: c.uri,
    location: BRANCH.name,
    status: c.status,
    mileage: c.mileage,
    utilization: c.utilization,
    description: c.description,
    notes: '',
    photos: [
      {
        id: `${c.id}_photo_1`,
        url: unsplashUrl(c.photoId, 800, 600),
        name: c.photoAlt,
        width: 1600,
        height: 1200,
        status: 'ready',
        variants: PHOTO_SIZES.map(({ size, width, height }) => ({
          size,
          width,
          height,
          url: unsplashUrl(c.photoId, width, height),
        })),
      },
    ],
    rateOptions: [
      {
        id: `${c.id}_daily`,
        label: DAILY,
        basis: 'day',
        rate: c.dailyRate,
        includedMiles: c.includedMilesPerDay,
        unlimitedMileage: false,
      },
    ],
    discountTiers: [],
    billableHoursPerDay: 8,
    fees: { deposit: c.deposit, overageRatePerMile: c.overagePerMile, taxRatePct: 7 },
    specs: { transmission: 'Automatic', fuelType: 'Petrol', seats: c.seats, doors: c.doors },
    features: ['airConditioning', 'gpsNavigation', 'bluetoothAudio', 'appleCarPlay', 'rearViewCamera'],
    createdAt: c.createdAt,
  }
}

export const vehicles: Vehicle[] = FLEET.map(toPortalVehicle)

export const locations: Location[] = [
  {
    id: BRANCH.id,
    name: BRANCH.name,
    address: BRANCH.address,
    street: BRANCH.street,
    city: BRANCH.city,
    state: BRANCH.state,
    postalCode: BRANCH.postalCode,
    country: COMPANY.country,
    latitude: BRANCH.latitude,
    longitude: BRANCH.longitude,
    status: 'Open',
    openingDays: 'monSun',
    opensAt: BRANCH.opensAt,
    closesAt: BRANCH.closesAt,
    isDefault: true,
    vehicleCount: FLEET.length,
  },
]

// --- Bookings ------------------------------------------------------------------------------

const cents = (dollars: number) => Math.round(dollars * 100)

interface BookingSeed {
  reference: string
  status: 'pending' | 'confirmed' | 'on_rental' | 'completed'
  renter: Renter
  vehicleId: string
  pickupAt: string
  returnAt: string
  /** How far the money got; the lifecycle timestamps follow from `status`. */
  payment: 'unpaid' | 'rental_paid' | 'paid'
  signed: boolean
  createdAt: string
}

/** A wire booking priced from the car's daily rate, the way the API's quote does it. */
function bookingWire(seed: BookingSeed, overrides: Partial<BookingWire> = {}): BookingWire {
  const c = car(seed.vehicleId)
  const days = Math.max(1, Math.round((Date.parse(seed.returnAt) - Date.parse(seed.pickupAt)) / 86_400_000))
  const drivers = overrides.additionalDrivers ?? []
  const fees = overrides.fees ?? []
  const rentalCents = cents(c.dailyRate) * days
  const driversCents = drivers.reduce((sum, d) => sum + d.pricePerDayCents * days, 0)
  const feesCents = fees.reduce((sum, f) => sum + f.amountCents, 0)
  const subtotalCents = rentalCents + driversCents + feesCents
  const taxCents = Math.round(subtotalCents * 0.07)
  const totalCents = subtotalCents + taxCents
  const paidCents = seed.payment === 'unpaid' ? 0 : totalCents
  const r = seed.renter
  const after = (iso: string, minutes: number) => new Date(Date.parse(iso) + minutes * 60_000).toISOString()
  const live = seed.status !== 'pending'
  const out = seed.status === 'on_rental' || seed.status === 'completed'

  return {
    id: `bkg_${seed.reference.slice(3)}`,
    reference: seed.reference,
    status: seed.status,
    customer: {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      dateOfBirth: r.dateOfBirth,
      address: r.address,
      licenceNumber: r.licenceNumber,
      licenceExpiry: r.licenceExpiry,
      gender: null,
      createdAt: seed.createdAt,
      updatedAt: seed.createdAt,
    },
    vehicleId: c.id,
    vehicleName: `${c.make} ${c.model}`,
    vehiclePlate: c.plate,
    rate: {
      optionId: `${c.id}_daily`,
      label: DAILY,
      basis: 'day',
      rateCents: cents(c.dailyRate),
      units: days,
      includedMiles: c.includedMilesPerDay * days,
      overageRatePerMileCents: cents(c.overagePerMile),
      lines: [
        {
          optionId: `${c.id}_daily`,
          label: DAILY,
          basis: 'day',
          rateCents: cents(c.dailyRate),
          count: days,
          cappedHours: null,
        },
      ],
    },
    pickupLocation: BRANCH.name,
    returnLocation: BRANCH.name,
    pickupAt: seed.pickupAt,
    returnAt: seed.returnAt,
    additionalDrivers: drivers,
    fees,
    verifications: ['identity', 'background', 'insurance'],
    pricing: {
      rentalSubtotalCents: rentalCents,
      discount: null,
      driversCents,
      feesCents,
      subtotalCents,
      taxRatePct: '7.00',
      taxCents,
      totalCents,
      depositCents: cents(c.deposit),
    },
    payment: {
      state: seed.payment,
      paidCents,
      refundedCents: 0,
      method: paidCents ? 'Visa ·· 4417' : null,
      paidAt: paidCents ? after(seed.createdAt, 26 * 60) : null,
    },
    // Only a renter booking for themselves states how they would pay; counter bookings do not.
    paymentPreference: seed.status === 'pending' ? 'online_rental_and_deposit' : null,
    notes: null,
    renterSubmitted: null,
    possibleDuplicates: [],
    declined: null,
    cancelled: null,
    contract: seed.signed
      ? { signedAt: after(seed.createdAt, 26 * 60 + 8), version: '3' }
      : { signedAt: null, version: null },
    verification: null,
    confirmedAt: live ? after(seed.createdAt, 3) : null,
    pickedUpAt: out ? after(seed.pickupAt, 6) : null,
    returnedAt: seed.status === 'completed' ? after(seed.returnAt, -14) : null,
    completedAt: seed.status === 'completed' ? after(seed.returnAt, 22) : null,
    pickupCondition: out ? { odometer: c.mileage - 640, fuelLevel: 8, notes: null } : null,
    returnCondition:
      seed.status === 'completed' ? { odometer: c.mileage - 388, fuelLevel: 7, notes: null } : null,
    createdAt: seed.createdAt,
    updatedAt: seed.createdAt,
    ...overrides,
  }
}

const verificationWire = (overrides: Partial<VerificationWire>): VerificationWire => ({
  id: 'ver_bg_20431',
  customerId: RENTERS.camila.id,
  status: 'clear',
  failureReason: null,
  recordsFound: false,
  hasReport: true,
  canReorder: false,
  reused: false,
  policy: null,
  validUntil: null,
  expired: false,
  completedAt: et(10, 10, 9),
  createdAt: et(10, 10, 8),
  updatedAt: et(10, 10, 9),
  ...overrides,
})

const backgroundWire = verificationWire({})

const heroWire = bookingWire(
  {
    reference: HERO_REFERENCE,
    status: 'confirmed',
    renter: RENTERS.camila,
    vehicleId: 'veh_audi_r8',
    pickupAt: et(13, 13),
    returnAt: et(16, 13),
    payment: 'paid',
    signed: true,
    createdAt: et(10, 10, 2),
  },
  {
    additionalDrivers: [{ ...EXTRA_DRIVER, pricePerDayCents: 2500 }],
    fees: [
      {
        id: 'fee_cdw',
        label: say('Collision damage waiver', 'Cobertura por daños (CDW)'),
        amountCents: 13500,
      },
    ],
    verification: backgroundWire,
  },
)

/** The week around 13 October, every car busy: what the calendar and the bar colours are read for. */
export const bookings: Booking[] = [
  bookingWire({
    reference: 'BK-20418',
    status: 'completed',
    renter: RENTERS.marcus,
    vehicleId: 'veh_audi_r8',
    pickupAt: et(9, 10),
    returnAt: et(13, 8),
    payment: 'paid',
    signed: true,
    createdAt: et(2, 15, 40),
  }),
  heroWire,
  bookingWire({
    reference: 'BK-20425',
    status: 'on_rental',
    renter: RENTERS.jamal,
    vehicleId: 'veh_huracan',
    pickupAt: et(11, 12),
    returnAt: et(14, 12),
    payment: 'paid',
    signed: true,
    createdAt: et(6, 9, 12),
  }),
  bookingWire({
    reference: 'BK-20440',
    status: 'pending',
    renter: RENTERS.sofia,
    vehicleId: 'veh_huracan',
    pickupAt: et(15, 10),
    returnAt: et(18, 10),
    payment: 'unpaid',
    signed: false,
    createdAt: et(12, 21, 4),
  }),
  bookingWire({
    reference: 'BK-20409',
    status: 'on_rental',
    renter: RENTERS.aisha,
    vehicleId: 'veh_expedition',
    pickupAt: et(8, 9),
    returnAt: et(15, 9),
    payment: 'paid',
    signed: true,
    createdAt: et(1, 18, 30),
  }),
  bookingWire({
    reference: 'BK-20444',
    status: 'confirmed',
    renter: RENTERS.daniel,
    vehicleId: 'veh_expedition',
    pickupAt: et(16, 9),
    returnAt: et(19, 18),
    payment: 'unpaid',
    signed: false,
    createdAt: et(12, 11, 20),
  }),
  bookingWire({
    reference: 'BK-20437',
    status: 'on_rental',
    renter: RENTERS.lucas,
    vehicleId: 'veh_amg_gt',
    pickupAt: et(12, 15),
    returnAt: et(14, 15),
    payment: 'paid',
    signed: true,
    createdAt: et(9, 13, 45),
  }),
  bookingWire({
    reference: 'BK-20447',
    status: 'confirmed',
    renter: RENTERS.hannah,
    vehicleId: 'veh_amg_gt',
    pickupAt: et(15, 12),
    returnAt: et(17, 12),
    payment: 'rental_paid',
    signed: true,
    createdAt: et(12, 16, 5),
  }),
  bookingWire({
    reference: 'BK-20422',
    status: 'completed',
    renter: RENTERS.mateo,
    vehicleId: 'veh_camaro',
    pickupAt: et(11, 9),
    returnAt: et(13, 9),
    payment: 'paid',
    signed: true,
    createdAt: et(7, 10, 15),
  }),
  bookingWire({
    reference: 'BK-20442',
    status: 'pending',
    renter: RENTERS.keiko,
    vehicleId: 'veh_camaro',
    pickupAt: et(14, 10),
    returnAt: et(17, 10),
    payment: 'unpaid',
    signed: false,
    createdAt: et(12, 19, 50),
  }),
].map(toBooking)

export const hero: Booking = toBooking(heroWire)

export const stats: BookingStats = {
  openBookings: 7,
  startingSoon: 5,
  expectedRevenue: 14382,
  needsAttention: 0,
  unpaid: 3,
  unsigned: 3,
  ready: 1,
  pending: bookings.filter((b) => b.status === 'Pending').length,
  tabCounts: { All: 214, Upcoming: 7, Today: 3, Overdue: 0 },
}

// --- The hero booking's cards ---------------------------------------------------------------

export const background: BookingVerification = toVerification(backgroundWire)

export const insurance: BookingVerification = toVerification(
  verificationWire({
    id: 'ver_ins_20431',
    policy: { carrier: 'progressive', policyNumber: '931-482-0577', expiresOn: '2027-03-14' },
    validUntil: '2027-03-14',
    hasReport: false,
    completedAt: et(11, 16, 31),
    createdAt: et(11, 16, 27),
    updatedAt: et(11, 16, 31),
  }),
)

export const contract: BookingContract = {
  status: 'signed',
  number: `AGR-${HERO_REFERENCE}`,
  template: {
    id: 'tpl_exotic',
    name: say('Exotic & performance vehicles', 'Vehículos exóticos y deportivos'),
    revision: 3,
  },
  signedAt: hero.contract.signedAt,
  signerName: RENTERS.camila.name,
  method: 'e_signature',
  companySigner: COMPANY.owner.fullName,
  link: { contractId: 'ctr_20431', token: 'demo-token' },
  actions: {
    sign: { allowed: false, reason: 'already_signed' },
    void: { allowed: true },
    changeTemplate: { allowed: false, reason: 'already_signed' },
  },
}

export const templates: AgreementTemplateSummary[] = [
  {
    id: 'tpl_standard',
    name: say('Standard rental agreement', 'Contrato de alquiler estándar'),
    revision: 5,
    isDefault: true,
    updatedAt: '2026-08-19T14:00:00.000Z',
  },
  {
    id: 'tpl_exotic',
    name: say('Exotic & performance vehicles', 'Vehículos exóticos y deportivos'),
    revision: 3,
    isDefault: false,
    updatedAt: '2026-09-02T14:00:00.000Z',
  },
]

const paidAt = hero.payment.paidAt ?? et(11, 12, 2)

export const payments: BookingPayments = {
  available: true,
  state: 'paid',
  currency: 'USD',
  total: hero.pricing.total,
  paid: hero.pricing.total,
  refunded: 0,
  balance: 0,
  overpaid: 0,
  returnCharges: [],
  returnChargesTotal: 0,
  returnChargesSaved: false,
  depositAmount: hero.pricing.deposit,
  deposit: {
    id: 'pay_dep_20431',
    kind: 'deposit',
    status: 'held',
    amount: hero.pricing.deposit,
    captured: 0,
    refunded: 0,
    currency: 'USD',
    method: 'Visa ·· 4417',
    captureBefore: et(18, 12, 4),
    completedAt: paidAt,
    createdAt: paidAt,
  },
  openLink: false,
  depositRequested: false,
  actions: {
    sendLink: { allowed: false, reason: 'nothing_to_collect' },
    linkIncludesDeposit: false,
    markPaid: { allowed: false, reason: 'nothing_to_collect' },
    requestDeposit: { allowed: false, reason: 'deposit_already_held' },
    releaseDeposit: { allowed: true },
    setReturnCharges: { allowed: false, reason: 'not_returned' },
    pickUp: { allowed: true },
    returnVehicle: { allowed: false, reason: 'not_on_rental' },
    close: { allowed: false, reason: 'not_returned' },
    cancel: { allowed: true },
    change: { allowed: true },
  },
  payments: [
    {
      id: 'pay_chg_20431',
      kind: 'charge',
      status: 'succeeded',
      amount: hero.pricing.total,
      captured: hero.pricing.total,
      refunded: 0,
      currency: 'USD',
      method: 'Visa ·· 4417',
      completedAt: paidAt,
      createdAt: paidAt,
    },
  ],
}

export const cancellation: CancellationQuote = {
  cancel: { allowed: true },
  currency: 'USD',
  paid: hero.pricing.total,
  paidByHand: 0,
  policy: [
    { daysBefore: 7, refundPercent: 100 },
    { daysBefore: 2, refundPercent: 50 },
  ],
  refundPercent: 0,
  policyRefund: 0,
  depositHeld: hero.pricing.deposit,
  withdrawsLink: false,
  emailsRenter: true,
}

export const extensions: BookingExtensions = { extend: { allowed: true }, history: [] }

const event = (
  id: string,
  type: string,
  at: string,
  actor: BookingActivityWire['actor'],
  detail: Record<string, unknown> = {},
): BookingActivityWire => ({ id, type, at, actor, detail })

const staff = { kind: 'staff' as const, name: COMPANY.owner.fullName }
const renterActor = { kind: 'renter' as const, name: null }

/** Newest first, as the API sends them. */
export const activity = [
  event('act_6', 'contract_signed', hero.contract.signedAt ?? paidAt, renterActor, {
    signerName: RENTERS.camila.name,
    method: 'e_signature',
  }),
  event('act_5', 'deposit_held', paidAt, renterActor, { amountCents: heroWire.pricing.depositCents }),
  event('act_4', 'payment_received', paidAt, renterActor, {
    amountCents: heroWire.pricing.totalCents,
    method: 'Visa ·· 4417',
  }),
  event('act_3', 'payment_link_created', et(10, 10, 14), staff, {
    amountCents: heroWire.pricing.totalCents,
    depositCents: heroWire.pricing.depositCents,
  }),
  event('act_2', 'contract_issued', et(10, 10, 11), staff, { template: contract.template.name }),
  event('act_1', 'created', et(10, 10, 2), staff, {
    vehicleName: hero.vehicleName,
    totalCents: heroWire.pricing.totalCents,
  }),
].map(toActivityEvent)
