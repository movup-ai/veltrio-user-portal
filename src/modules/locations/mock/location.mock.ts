import type { Location } from '../types/location.types'

export const LOCATIONS: Location[] = [
  {
    name: 'Miami Beach',
    address: '1440 Collins Ave, Miami Beach, FL 33139',
    status: 'Open',
    hours: { daysKey: 'monSun', range: '07:00 – 22:00' },
    manager: 'Camila Ortiz',
    metrics: [
      { value: '58', key: 'vehicles' },
      { value: '81%', key: 'utilization' },
      { value: '$112k', key: 'revenueMtd' },
    ],
  },
  {
    name: 'Orlando Intl.',
    address: '9250 Jeff Fuqua Blvd, Orlando, FL 32827',
    status: 'Open',
    hours: { daysKey: 'monSun', range: '05:30 – 23:30' },
    manager: 'Nate Ferraro',
    metrics: [
      { value: '54', key: 'vehicles' },
      { value: '72%', key: 'utilization' },
      { value: '$103k', key: 'revenueMtd' },
    ],
  },
  {
    name: 'Tampa Downtown',
    address: '310 E Kennedy Blvd, Tampa, FL 33602',
    status: 'Limited hours',
    hours: { daysKey: 'monFri', range: '08:00 – 18:00' },
    manager: 'Rosa Lindqvist',
    metrics: [
      { value: '30', key: 'vehicles' },
      { value: '64%', key: 'utilization' },
      { value: '$69k', key: 'revenueMtd' },
    ],
  },
]
