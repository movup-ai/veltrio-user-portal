import { lazy } from 'react'

export const AgreementsPage = lazy(() => import('./AgreementsPage').then((m) => ({ default: m.AgreementsPage })))
