import enAuth from './locales/en/auth.json'
import enBookings from './locales/en/bookings.json'
import enCommon from './locales/en/common.json'
import enContracts from './locales/en/contracts.json'
import enCustomers from './locales/en/customers.json'
import enDashboard from './locales/en/dashboard.json'
import enDomain from './locales/en/domain.json'
import enLocations from './locales/en/locations.json'
import enNav from './locales/en/nav.json'
import enPayments from './locales/en/payments.json'
import enPricing from './locales/en/pricing.json'
import enSettings from './locales/en/settings.json'
import enValidation from './locales/en/validation.json'
import enVehicles from './locales/en/vehicles.json'

import esAuth from './locales/es/auth.json'
import esBookings from './locales/es/bookings.json'
import esCommon from './locales/es/common.json'
import esContracts from './locales/es/contracts.json'
import esCustomers from './locales/es/customers.json'
import esDashboard from './locales/es/dashboard.json'
import esDomain from './locales/es/domain.json'
import esLocations from './locales/es/locations.json'
import esNav from './locales/es/nav.json'
import esPayments from './locales/es/payments.json'
import esPricing from './locales/es/pricing.json'
import esSettings from './locales/es/settings.json'
import esValidation from './locales/es/validation.json'
import esVehicles from './locales/es/vehicles.json'

/**
 * Every namespace is bundled eagerly. The full translation set is a few dozen KB, so
 * code-splitting it would cost a flash of untranslated UI on first paint for no real win —
 * switch to i18next-http-backend here if the catalogue ever grows past that.
 */
export const resources = {
  en: {
    auth: enAuth,
    bookings: enBookings,
    common: enCommon,
    contracts: enContracts,
    customers: enCustomers,
    dashboard: enDashboard,
    domain: enDomain,
    locations: enLocations,
    nav: enNav,
    payments: enPayments,
    pricing: enPricing,
    settings: enSettings,
    validation: enValidation,
    vehicles: enVehicles,
  },
  es: {
    auth: esAuth,
    bookings: esBookings,
    common: esCommon,
    contracts: esContracts,
    customers: esCustomers,
    dashboard: esDashboard,
    domain: esDomain,
    locations: esLocations,
    nav: esNav,
    payments: esPayments,
    pricing: esPricing,
    settings: esSettings,
    validation: esValidation,
    vehicles: esVehicles,
  },
} as const

export const NAMESPACES = Object.keys(resources.en) as (keyof typeof resources.en)[]

export const DEFAULT_NAMESPACE = 'common'
