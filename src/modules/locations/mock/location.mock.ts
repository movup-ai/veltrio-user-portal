import type { Location } from '../types/location.types'

export const LOCATIONS: Location[] = [
  {
    name: 'Miami Beach',
    address: '1440 Collins Ave, Miami Beach, FL 33139',
    status: 'Open',
    hours: 'Mon–Sun · 07:00 – 22:00',
    manager: 'Camila Ortiz · Branch manager',
    metrics: [
      { value: '58', label: 'Vehicles' },
      { value: '81%', label: 'Utilization' },
      { value: '$112k', label: 'Revenue MTD' },
    ],
  },
  {
    name: 'Orlando Intl.',
    address: '9250 Jeff Fuqua Blvd, Orlando, FL 32827',
    status: 'Open',
    hours: 'Mon–Sun · 05:30 – 23:30',
    manager: 'Nate Ferraro · Branch manager',
    metrics: [
      { value: '54', label: 'Vehicles' },
      { value: '72%', label: 'Utilization' },
      { value: '$103k', label: 'Revenue MTD' },
    ],
  },
  {
    name: 'Tampa Downtown',
    address: '310 E Kennedy Blvd, Tampa, FL 33602',
    status: 'Limited hours',
    hours: 'Mon–Fri · 08:00 – 18:00',
    manager: 'Rosa Lindqvist · Branch manager',
    metrics: [
      { value: '30', label: 'Vehicles' },
      { value: '64%', label: 'Utilization' },
      { value: '$69k', label: 'Revenue MTD' },
    ],
  },
]
