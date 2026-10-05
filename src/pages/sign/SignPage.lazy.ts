import { lazy } from 'react'

/** Lazy, so the signature pad is only fetched where an agreement is signed. */
export const SignPage = lazy(() => import('./SignPage').then((m) => ({ default: m.SignPage })))
