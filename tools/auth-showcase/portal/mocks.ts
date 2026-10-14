import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { billingApi } from '@/modules/billing/api/billing.api'
import { bookingApi } from '@/modules/bookings/api/booking.api'
import { verificationApi } from '@/modules/bookings/api/verification.api'
import type { ProviderKind } from '@/modules/bookings/types/booking.types'
import { buildBookingDetails } from '@/modules/bookings/utils/booking.details'
import { bookingToTuple } from '@/modules/bookings/utils/booking.utils'
import { agreementTemplateApi } from '@/modules/contracts/api/agreement-template.api'
import { bookingContractApi } from '@/modules/contracts/api/booking-contract.api'
import { locationApi } from '@/modules/locations/api/location.api'
import { bookingExtensionApi } from '@/modules/payments/api/booking-extension.api'
import { bookingPaymentApi } from '@/modules/payments/api/booking-payment.api'
import { vehicleApi } from '@/modules/vehicles/api/vehicle.api'
import { apiClient } from '@/services/api/client'
import { authApi } from '@/services/auth/auth.api'
import { useOrganizationStore } from '@/state/organization.store'
import { BRANCH } from '../shared/sunstate.ts'
import * as f from './fixtures'

/**
 * The API objects are plain exports read on every call, so overwriting their methods is enough.
 * Anything left unmocked is logged and refused, so the capture script can list what a page asked for.
 */
export function installMocks(): void {
  useOrganizationStore.setState({ membership: f.membership })

  // `satisfies` so a mock that drifts from the real signature fails the harness typecheck.
  Object.assign(authApi, { getMe: async () => f.me } satisfies Partial<typeof authApi>)
  Object.assign(billingApi, { get: async () => f.billing } satisfies Partial<typeof billingApi>)
  Object.assign(vehicleApi, {
    listAll: async () => f.vehicles,
    get: async (id: string) => f.vehicles.find((v) => v.id === id) ?? f.vehicles[0],
  } satisfies Partial<typeof vehicleApi>)
  Object.assign(locationApi, { list: async () => f.locations } satisfies Partial<typeof locationApi>)
  Object.assign(bookingApi, {
    stats: async () => f.stats,
    calendar: async () => f.bookings,
    activity: async () => f.activity,
    detail: async () => {
      const vehicle = f.vehicles.find((v) => v.id === f.hero.vehicleId)
      return buildBookingDetails(bookingToTuple(f.hero), f.hero, {
        vehicle,
        branch: { address: BRANCH.address, manager: BRANCH.manager },
      })
    },
  } satisfies Partial<typeof bookingApi>)
  Object.assign(verificationApi, {
    get: async (_reference: string, kind: ProviderKind = 'background') =>
      kind === 'insurance' ? f.insurance : f.background,
  } satisfies Partial<typeof verificationApi>)
  Object.assign(bookingContractApi, { get: async () => f.contract } satisfies Partial<
    typeof bookingContractApi
  >)
  Object.assign(agreementTemplateApi, { list: async () => f.templates } satisfies Partial<
    typeof agreementTemplateApi
  >)
  Object.assign(bookingPaymentApi, {
    get: async () => f.payments,
    cancellationQuote: async () => f.cancellation,
  } satisfies Partial<typeof bookingPaymentApi>)
  Object.assign(bookingExtensionApi, { get: async () => f.extensions } satisfies Partial<
    typeof bookingExtensionApi
  >)

  apiClient.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    console.warn(`[showcase] unmocked ${config.method?.toUpperCase()} ${config.url}`)
    return Promise.reject(
      new AxiosError('Not mocked in the showcase harness', AxiosError.ERR_BAD_REQUEST, config, undefined, {
        status: 404,
        statusText: 'Not Found',
        data: { error: { code: 'not_found', message: 'Not mocked' } },
        headers: {},
        config,
      }),
    )
  }
}
