import { lazy } from 'react'

export const UsersPage = lazy(() => import('./UsersPage').then((m) => ({ default: m.UsersPage })))
