import { lazy } from 'react'

/** Lazy, like the payment page: only a renter opening their receipt needs it. */
export const ReceiptPage = lazy(() => import('./ReceiptPage').then((m) => ({ default: m.ReceiptPage })))
