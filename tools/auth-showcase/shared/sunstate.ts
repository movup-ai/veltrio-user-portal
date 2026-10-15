/**
 * One believable company for every marketing capture: the portal harness and the booking-site
 * mock API both read it. Plain data with no imports, so Node can load it by type stripping.
 * All people, emails and phone numbers are invented (555-01xx numbers, example.com addresses).
 */

/** Tuesday 13 Oct 2026, 10:30 in Miami (EDT, UTC-4). */
const TODAY_ISO = '2026-10-13T14:30:00.000Z'
export const TODAY_MS = Date.parse(TODAY_ISO)

export const COMPANY = {
  id: 'ten_sunstate',
  name: 'Sunstate Car Co.',
  subdomain: 'sunstate-car-co',
  city: 'Miami',
  state: 'Florida',
  country: 'US',
  currency: 'USD',
  timezone: 'America/New_York',
  phone: '+1 (305) 555-0100',
  headline: 'Exotic and everyday cars, handed over on Miami Beach.',
  description:
    'A family-run rental company on Miami Beach since 2014. Every car is detailed before it goes out, and the keys are handed over in person.',
  owner: { id: 'user_demo', fullName: 'Diego Herrera', email: 'diego.herrera@example.com' },
} as const

export const BRANCH = {
  id: 'loc_miami_beach',
  name: 'Miami Beach',
  street: '1450 Alton Road',
  city: 'Miami Beach',
  state: 'FL',
  postalCode: '33139',
  address: '1450 Alton Road, Miami Beach, FL 33139',
  latitude: 25.7859,
  longitude: -80.1413,
  /** 8:00 to 20:00, every day. */
  opensAt: 480,
  closesAt: 1200,
  manager: 'Diego Herrera',
} as const

/** The same URL shape as the customer portal's `src/shared/lib/unsplash.ts`. */
export function unsplashUrl(id: string, width: number, height: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=75&w=${width}&h=${height}`
}

interface PhotoSizeSpec {
  size: 'thumbnail' | 'medium' | 'large'
  width: number
  height: number
}

/** 4:3, like the vehicle photos the API renders. */
export const PHOTO_SIZES: PhotoSizeSpec[] = [
  { size: 'thumbnail', width: 320, height: 240 },
  { size: 'medium', width: 800, height: 600 },
  { size: 'large', width: 1600, height: 1200 },
]

export interface FleetCar {
  id: string
  make: string
  model: string
  /** The model line the booking-site card and the portal list print. */
  trim: string
  year: number
  /** The portal's `VehicleType` and the booking site's slug. */
  portalType: 'Sport' | 'SUV' | 'Coupe' | 'Convertible'
  siteType: 'sport' | 'suv' | 'coupe' | 'convertible'
  color: string
  plate: string
  vin: string
  uri: string
  dailyRate: number
  deposit: number
  includedMilesPerDay: number
  overagePerMile: number
  mileage: number
  utilization: number
  status: 'Available' | 'On rent'
  seats: number
  doors: number
  horsepower: number
  zeroToSixtySec: number
  topSpeedMph: number
  cylinders: number
  photoId: string
  photoAlt: string
  description: string
  createdAt: string
}

export const FLEET: FleetCar[] = [
  {
    id: 'veh_audi_r8',
    make: 'Audi',
    model: 'R8',
    trim: 'V10 Performance',
    year: 2023,
    portalType: 'Sport',
    siteType: 'sport',
    color: 'Daytona Gray',
    plate: 'QVR K48',
    vin: 'WUAKBAFX6P7900418',
    uri: 'audi-r8-2023',
    dailyRate: 649,
    deposit: 2500,
    includedMilesPerDay: 100,
    overagePerMile: 1.25,
    mileage: 8214,
    utilization: 0.81,
    status: 'Available',
    seats: 2,
    doors: 2,
    horsepower: 602,
    zeroToSixtySec: 3.1,
    topSpeedMph: 205,
    cylinders: 10,
    photoId: '1603584173870-7f23fdae1b7a',
    photoAlt: 'Grey Audi R8 on a mountain road at sunset',
    description: 'Mid-engine V10 with quattro grip. Collected detailed and fuelled with premium.',
    createdAt: '2025-02-11T15:00:00.000Z',
  },
  {
    id: 'veh_huracan',
    make: 'Lamborghini',
    model: 'Huracán',
    trim: 'EVO',
    year: 2022,
    portalType: 'Sport',
    siteType: 'sport',
    color: 'Giallo Inti',
    plate: 'JHX P21',
    vin: 'ZHWUF4ZF1NLA17290',
    uri: 'lamborghini-huracan-2022',
    dailyRate: 1195,
    deposit: 5000,
    includedMilesPerDay: 75,
    overagePerMile: 3.5,
    mileage: 11902,
    utilization: 0.74,
    status: 'On rent',
    seats: 2,
    doors: 2,
    horsepower: 631,
    zeroToSixtySec: 2.9,
    topSpeedMph: 202,
    cylinders: 10,
    photoId: '1511919884226-fd3cad34687c',
    photoAlt: 'Yellow Lamborghini Huracán parked on a tree-lined street',
    description: 'The naturally aspirated V10 everyone turns around for. Renters 25 and over.',
    createdAt: '2025-03-04T15:00:00.000Z',
  },
  {
    id: 'veh_expedition',
    make: 'Ford',
    model: 'Expedition',
    trim: 'Platinum Max',
    year: 2024,
    portalType: 'SUV',
    siteType: 'suv',
    color: 'Oxford White',
    plate: 'BTW M63',
    vin: '1FMJK1PT4REA21876',
    uri: 'ford-expedition-2024',
    dailyRate: 219,
    deposit: 750,
    includedMilesPerDay: 200,
    overagePerMile: 0.45,
    mileage: 19377,
    utilization: 0.88,
    status: 'On rent',
    seats: 8,
    doors: 4,
    horsepower: 440,
    zeroToSixtySec: 5.9,
    topSpeedMph: 112,
    cylinders: 6,
    photoId: '1533473359331-0135ef1b58bf',
    photoAlt: 'White Ford Expedition on a desert road',
    description: 'Eight seats and room for the luggage. Car seats on request.',
    createdAt: '2025-01-20T15:00:00.000Z',
  },
  {
    id: 'veh_amg_gt',
    make: 'Mercedes-AMG',
    model: 'GT',
    trim: '63 Coupé',
    year: 2024,
    portalType: 'Coupe',
    siteType: 'coupe',
    color: 'Iridium Silver',
    plate: 'KSD R15',
    vin: 'W1KRJ8AB3RF002914',
    uri: 'mercedes-amg-gt-2024',
    dailyRate: 549,
    deposit: 2000,
    includedMilesPerDay: 100,
    overagePerMile: 1.1,
    mileage: 6540,
    utilization: 0.79,
    status: 'On rent',
    seats: 4,
    doors: 2,
    horsepower: 577,
    zeroToSixtySec: 3.1,
    topSpeedMph: 196,
    cylinders: 8,
    photoId: '1616788494707-ec28f08d05a1',
    photoAlt: 'Silver Mercedes-AMG GT with a city skyline behind it',
    description: 'A grand tourer with a hand-built V8. Comfortable enough for the Keys and back.',
    createdAt: '2025-04-15T15:00:00.000Z',
  },
  {
    id: 'veh_camaro',
    make: 'Chevrolet',
    model: 'Camaro',
    trim: '2SS',
    year: 2024,
    portalType: 'Coupe',
    siteType: 'coupe',
    color: 'Summit White',
    plate: 'FZN C82',
    vin: '1G1FH1R74R0102265',
    uri: 'chevrolet-camaro-2024',
    dailyRate: 159,
    deposit: 500,
    includedMilesPerDay: 150,
    overagePerMile: 0.4,
    mileage: 14018,
    utilization: 0.83,
    status: 'Available',
    seats: 4,
    doors: 2,
    horsepower: 455,
    zeroToSixtySec: 4.0,
    topSpeedMph: 165,
    cylinders: 8,
    photoId: '1492144534655-ae79c964c9d7',
    photoAlt: 'White Chevrolet Camaro in a dimly lit garage',
    description: 'The last of the V8 Camaros. A Miami weekend classic.',
    createdAt: '2025-05-02T15:00:00.000Z',
  },
]

export interface Renter {
  id: string
  name: string
  email: string
  phone: string
  dateOfBirth: string
  licenceNumber: string
  licenceExpiry: string
  address: string
}

const renter = (
  id: string,
  name: string,
  phone: string,
  dob: string,
  licence: string,
  address: string,
): Renter => ({
  id,
  name,
  email: `${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.')}@example.com`,
  phone,
  dateOfBirth: dob,
  licenceNumber: licence,
  licenceExpiry: `20${29 + (Number(dob.slice(8, 10)) % 3)}-${dob.slice(5, 7)}-${dob.slice(8, 10)}`,
  address,
})

export const RENTERS = {
  camila: renter(
    'cus_camila',
    'Camila Restrepo',
    '+1 (305) 555-0142',
    '1990-06-21',
    'R236-541-90-621-0',
    '2150 Brickell Ave, Apt 1804, Miami, FL 33129',
  ),
  marcus: renter(
    'cus_marcus',
    'Marcus Bennett',
    '+1 (404) 555-0187',
    '1985-02-09',
    'B553-120-85-049-0',
    '880 Peachtree St NE, Atlanta, GA 30309',
  ),
  aisha: renter(
    'cus_aisha',
    'Aisha Okafor',
    '+1 (713) 555-0119',
    '1988-11-03',
    'O216-774-88-903-1',
    '4512 Montrose Blvd, Houston, TX 77006',
  ),
  daniel: renter(
    'cus_daniel',
    'Daniel Nguyen',
    '+1 (408) 555-0133',
    '1993-04-27',
    'N250-318-93-427-2',
    '1220 Lincoln Ave, San Jose, CA 95125',
  ),
  sofia: renter(
    'cus_sofia',
    'Sofia Marchetti',
    '+1 (212) 555-0164',
    '1991-08-14',
    'M623-410-91-814-0',
    '301 E 64th St, New York, NY 10065',
  ),
  jamal: renter(
    'cus_jamal',
    'Jamal Whitaker',
    '+1 (305) 555-0178',
    '1987-01-30',
    'W326-552-87-030-4',
    '1000 Brickell Plaza, Miami, FL 33131',
  ),
  lucas: renter(
    'cus_lucas',
    'Lucas Moreau',
    '+1 (514) 555-0126',
    '1984-09-18',
    'M600-219-84-918-3',
    '1450 Rue Peel, Montreal, QC H3A 1S8',
  ),
  hannah: renter(
    'cus_hannah',
    'Hannah Goldberg',
    '+1 (617) 555-0151',
    '1995-12-05',
    'G416-308-95-205-1',
    '75 Commonwealth Ave, Boston, MA 02116',
  ),
  mateo: renter(
    'cus_mateo',
    'Mateo Álvarez',
    '+1 (786) 555-0109',
    '1992-03-12',
    'A412-660-92-312-0',
    '2600 SW 27th Ave, Miami, FL 33133',
  ),
  keiko: renter(
    'cus_keiko',
    'Keiko Tanaka',
    '+1 (206) 555-0192',
    '1989-07-22',
    'T520-147-89-722-5',
    '1521 2nd Ave, Seattle, WA 98101',
  ),
}

/** The additional driver on the hero booking. */
export const EXTRA_DRIVER = { id: 'drv_andres', name: 'Andrés Restrepo', licenceNumber: 'R236-118-88-302-0' }

/** The booking the details page shows: confirmed, paid, signed and checked, picking up today at 13:00. */
export const HERO_REFERENCE = 'BK-20431'
/** The car that booking is for. */
export const HERO_CAR = FLEET.find((car) => car.id === 'veh_audi_r8') as FleetCar
/** The agreement and payment links the hero booking's renter was sent. */
export const RENTER_LINK = { contractId: 'ctr_20431', token: 'demo-token' } as const
