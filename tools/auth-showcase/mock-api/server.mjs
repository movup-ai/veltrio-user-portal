// The marketplace endpoints the booking site's company page reads, served from the shared
// Sunstate data. Any other path is logged and answered empty, so a new dependency shows up here.
import http from 'node:http'
import { BRANCH, COMPANY, FLEET, PHOTO_SIZES, unsplashUrl } from '../shared/sunstate.ts'

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

function page(items, query) {
  const limit = Number(query.get('limit') ?? 100)
  const offset = Number(query.get('offset') ?? 0)
  return { items: items.slice(offset, offset + limit), total: items.length, limit, offset }
}

function route(path, query) {
  const companyPath = `/marketplace/companies/${COMPANY.subdomain}`
  if (path === companyPath) return [200, company]
  if (path === `${companyPath}/locations`) return [200, locations]
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
