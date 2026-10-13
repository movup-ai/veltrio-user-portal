import * as Sentry from '@sentry/react'
import { useOrganizationStore } from '@/state/organization.store'
import { ApiError } from '@/types/api'

/**
 * Error reporting to Sentry. Errors only: no performance tracing and no session replay, and
 * nothing that names a person. Off without a DSN, which is how development and CI run.
 */

const DSN = import.meta.env.VITE_SENTRY_DSN

/** Call once, before the first render, so an error while the app starts is caught too. */
export function initErrorReporting(): void {
  if (!DSN) return

  Sentry.init({
    dsn: DSN,
    // Vite's mode unless named: a preview deployment builds in `production` mode like the real one.
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    // This SDK collects these unless told not to. Requests here carry renters' details and the
    // staff member's session, none of which belongs in an error report.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    beforeSend(event, hint) {
      const error = hint.originalException
      if (error instanceof ApiError) {
        for (const exception of event.exception?.values ?? []) {
          if (exception.type === error.name) exception.value = apiFaultMessage(error)
        }
      }
      return event
    },
  })

  // Which company an error happened in. Its subdomain is public; staff names and emails are not sent.
  const tagCompany = (subdomain: string | undefined) => Sentry.setTag('company', subdomain)
  tagCompany(useOrganizationStore.getState().membership?.subdomain)
  useOrganizationStore.subscribe((state) => tagCompany(state.membership?.subdomain))
}

/**
 * How an API fault reads in a report: by status and code. Its own message is written by the API
 * for the person at the screen, and can name a renter or quote what they typed.
 */
function apiFaultMessage(error: ApiError): string {
  return ['API', error.status ?? error.kind, error.code].filter(Boolean).join(' ')
}

/**
 * Whether an error is a fault to look into. An API answer the user is shown and can act on (a
 * duplicate VIN, an expired session, no connection) is the app working, and would bury the rest.
 */
export function worthReporting(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true
  return error.kind === 'server_error' || error.kind === 'unknown'
}

/** For errors the app handles itself (a failed query shows a message) and so never go uncaught. */
export function reportError(error: unknown): void {
  if (worthReporting(error)) Sentry.captureException(error)
}

/** React 19's root error hooks: a render crash is reported whether or not a boundary caught it. */
export const rootErrorHandlers = {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}
