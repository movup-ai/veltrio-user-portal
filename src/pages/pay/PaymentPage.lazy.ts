import { lazy } from 'react'

/** Lazy, so Stripe.js is only fetched by the renter's payment page, not the whole portal. */
export const PaymentPage = lazy(() => import('./PaymentPage').then((m) => ({ default: m.PaymentPage })))
