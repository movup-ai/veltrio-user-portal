// The marketplace endpoints the booking site's company page reads, served from the shared
// Sunstate data. Any other path is logged and answered empty, so a new dependency shows up here.
import http from 'node:http'
import {
  BRANCH,
  COMPANY,
  FLEET,
  HERO_CAR,
  HERO_REFERENCE,
  PHOTO_SIZES,
  RENTER_LINK,
  RENTERS,
  unsplashUrl,
} from '../shared/sunstate.ts'

const PORT = Number(process.env.MOCK_API_PORT ?? 4100)
const PREFIX = '/api/v1'

/** Sunset coral on a warm white, picked to sit beside both the yellow and the grey cars. */
const BRAND = { primaryColor: '#E4572E', backgroundColor: '#FFFDF9', textColor: '#1C1917' }

const company = {
  id: COMPANY.id,
  name: COMPANY.name,
  subdomain: COMPANY.subdomain,
  description: COMPANY.description,
  website: null,
  country: COMPANY.country,
  currency: COMPANY.currency,
  timezone: COMPANY.timezone,
  contactEmail: null,
  contactPhone: COMPANY.phone,
  address: BRANCH.address,
  instagramUrl: null,
  facebookUrl: null,
  xUrl: null,
  tiktokUrl: null,
  brand: {
    ...BRAND,
    headline: COMPANY.headline,
    logoUrl: null,
    bannerUrl: unsplashUrl('1616788494707-ec28f08d05a1', 2400, 1350),
  },
  vehicleCount: FLEET.length,
}

const locations = [
  {
    id: BRANCH.id,
    name: BRANCH.name,
    address: BRANCH.address,
    latitude: BRANCH.latitude,
    longitude: BRANCH.longitude,
    isDefault: true,
    openingDays: 'mon_sun',
    opensAt: BRANCH.opensAt,
    closesAt: BRANCH.closesAt,
    vehicleCount: FLEET.length,
  },
]

const vehicles = FLEET.map((car) => ({
  id: car.id,
  uri: car.uri,
  make: car.make,
  model: car.model,
  year: car.year,
  vehicleType: car.siteType,
  color: car.color,
  location: BRANCH.name,
  description: car.description,
  features: ['air_conditioning', 'gps_navigation', 'bluetooth_audio', 'apple_car_play', 'rear_view_camera'],
  photos: [
    {
      id: `${car.id}_photo_1`,
      name: car.photoAlt,
      label: null,
      variants: PHOTO_SIZES.map(({ size, width, height }) => ({
        size,
        width,
        height,
        url: unsplashUrl(car.photoId, width, height),
      })),
    },
  ],
  dailyRateCents: car.dailyRate * 100,
  specs: {
    transmission: 'automatic',
    fuelType: 'petrol',
    seats: car.seats,
    doors: car.doors,
    topSpeedMph: car.topSpeedMph,
    horsepower: car.horsepower,
    zeroToSixtySec: car.zeroToSixtySec,
    cylinders: car.cylinders,
  },
  company: { id: COMPANY.id, name: COMPANY.name, subdomain: COMPANY.subdomain, timezone: COMPANY.timezone },
}))

// --- The hero booking, as its renter sees it: BK-20431, Camila's R8, before the 1 PM pickup -----

const CANCELLATION = [
  { daysBefore: 7, refundPercent: 100 },
  { daysBefore: 2, refundPercent: 50 },
]

const vehicleDetail = {
  ...vehicles.find((v) => v.id === HERO_CAR.id),
  rateOptions: [
    {
      id: `${HERO_CAR.id}_daily`,
      label: 'Daily',
      basis: 'day',
      rateCents: HERO_CAR.dailyRate * 100,
      blockDuration: null,
      blockDurationUnit: null,
      includedMiles: HERO_CAR.includedMilesPerDay,
      unlimitedMileage: false,
    },
  ],
  discountTiers: [{ minDays: 7, percentOff: 10 }],
  billableHoursPerDay: 8,
  fees: { taxRatePct: 7, depositCents: HERO_CAR.deposit * 100 },
  // Out with Camila from today; the picker greys those days.
  occupancy: { ranges: [{ start: '2026-10-13', end: '2026-10-16' }], through: '2027-04-13' },
  cancellationPolicy: CANCELLATION,
}

const agreement = {
  companyName: COMPANY.name,
  reference: HERO_REFERENCE,
  number: `AGR-${HERO_REFERENCE}`,
  renterName: RENTERS.camila.name,
  status: 'open',
  sections: [
    {
      title: 'Rental',
      rows: [
        {
          label: 'Vehicle',
          value: `${HERO_CAR.year} ${HERO_CAR.make} ${HERO_CAR.model} · ${HERO_CAR.plate}`,
        },
        { label: 'Pickup', value: 'Tue, Oct 13, 2026, 1:00 PM · Miami Beach' },
        { label: 'Return', value: 'Fri, Oct 16, 2026, 1:00 PM · Miami Beach' },
        { label: 'Mileage', value: '300 mi included, then $1.25/mi' },
      ],
    },
    {
      title: 'Renter',
      rows: [
        { label: 'Name', value: RENTERS.camila.name },
        { label: 'Licence', value: RENTERS.camila.licenceNumber },
      ],
    },
  ],
  charges: [
    { label: 'Daily', detail: '$649 × 3', amount: '$1,947.00' },
    { label: 'Additional driver', detail: '1 driver · $25/day', amount: '$75.00' },
    { label: 'Collision damage waiver', detail: '', amount: '$135.00' },
    { label: 'Taxes & fees', detail: 'Branch surcharge + 7% sales tax', amount: '$150.99' },
  ],
  totals: [
    { label: 'Total', amount: '$2,307.99', strong: true },
    { label: 'Security deposit (held)', amount: '$2,500.00', strong: false },
  ],
  terms: [
    { heading: true, text: '1. Use of the vehicle' },
    {
      heading: false,
      text: 'Only the renter and named drivers may drive. No racing, towing or off-road use.',
    },
    { heading: true, text: '2. Fuel and mileage' },
    {
      heading: false,
      text: 'Return the car with the fuel it left with. Miles over the allowance are charged per mile.',
    },
  ],
  companySignature: {
    company: COMPANY.name,
    name: COMPANY.owner.fullName,
    title: 'Owner',
    signature: null,
    signed: 'Oct 10, 2026',
    issuedBy: COMPANY.owner.fullName,
  },
  signedAt: null,
  signerName: null,
}

const paymentLink = {
  companyName: COMPANY.name,
  reference: HERO_REFERENCE,
  renterName: RENTERS.camila.name,
  vehicleName: `${HERO_CAR.make} ${HERO_CAR.model}`,
  vehiclePhotoUrl: unsplashUrl(HERO_CAR.photoId, 640, 480),
  vehicleSpecs: {
    year: HERO_CAR.year,
    vehicleType: HERO_CAR.siteType,
    transmission: 'automatic',
    fuelType: 'petrol',
    seats: HERO_CAR.seats,
  },
  pickupAt: '2026-10-13T13:00:00-04:00',
  returnAt: '2026-10-16T13:00:00-04:00',
  pickupLocation: BRANCH.name,
  currency: COMPANY.currency,
  depositCents: HERO_CAR.deposit * 100,
  stripeAccountId: 'acct_1DemoSunstate',
  // Well-formed but fake: the summary is what is captured, never the card form.
  charge: { status: 'open', amountCents: 230799, clientSecret: 'pi_3Demo_secret_demo' },
  deposit: { status: 'open', amountCents: HERO_CAR.deposit * 100, clientSecret: 'pi_3DemoHold_secret_demo' },
  extension: null,
  cancellationPolicy: CANCELLATION,
  receipt: null,
}

function page(items, query) {
  const limit = Number(query.get('limit') ?? 100)
  const offset = Number(query.get('offset') ?? 0)
  return { items: items.slice(offset, offset + limit), total: items.length, limit, offset }
}

function route(path, query) {
  const companyPath = `/marketplace/companies/${COMPANY.subdomain}`
  if (path === companyPath) return [200, company]
  if (path === `${companyPath}/locations`) return [200, locations]
  if (path === `${companyPath}/vehicles/${HERO_CAR.uri}`) return [200, vehicleDetail]
  const { contractId, token } = RENTER_LINK
  if (path === `${companyPath}/contracts/${contractId}/${token}`) return [200, agreement]
  if (path === `${companyPath}/payments/${token}`) return [200, paymentLink]
  if (path === '/marketplace/vehicles') return [200, page(vehicles, query)]
  if (path === '/marketplace/companies') return [200, page([company], query)]
  return undefined
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)
  const path = url.pathname.startsWith(PREFIX) ? url.pathname.slice(PREFIX.length) : url.pathname
  const known = request.method === 'GET' ? route(path, url.searchParams) : undefined
  let status
  let body
  if (known) {
    ;[status, body] = known
    console.log(`[mock-api] ${request.method} ${url.pathname}${url.search} -> ${status}`)
  } else if (url.searchParams.has('limit')) {
    // A list nobody mocked: an empty page keeps the site rendering.
    ;[status, body] = [200, page([], url.searchParams)]
    console.log(`[mock-api] UNMOCKED ${request.method} ${url.pathname}${url.search} -> empty page`)
  } else {
    ;[status, body] = [404, { error: { code: 'not_found', message: 'Not mocked' } }]
    console.log(`[mock-api] UNMOCKED ${request.method} ${url.pathname}${url.search} -> 404`)
  }
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
})

server.listen(PORT, '127.0.0.1', () =>
  console.log(`[mock-api] listening on http://127.0.0.1:${PORT}${PREFIX}`),
)
