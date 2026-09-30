/**
 * Query parameters on the page Axle returns the renter to. Axle adds `status`, `authCode`,
 * `client` and `result`; `tenantId` and `verificationId` are ours, put on the redirect URI when
 * the session was opened: the page has no login, and nothing Axle sends back says whose check
 * the code belongs to.
 */
export type InsuranceRedirect =
  | { outcome: 'complete'; tenantId: string; verificationId: string; authCode: string }
  | { outcome: 'unfinished'; verificationId: string }

/** What the renter came back with, or nothing when this is an ordinary page load. */
export function readInsuranceRedirect(search: string): InsuranceRedirect | undefined {
  const params = new URLSearchParams(search)
  const verificationId = params.get('verificationId')
  if (!verificationId || !params.has('status')) return undefined

  const tenantId = params.get('tenantId')
  const authCode = params.get('authCode')
  // Anything short of a completed session with a code is the renter backing out or Axle
  // failing - there is nothing to exchange, and the session stays open to be reopened.
  return params.get('status') === 'complete' && authCode && tenantId
    ? { outcome: 'complete', tenantId, verificationId, authCode }
    : { outcome: 'unfinished', verificationId }
}

/**
 * The page Axle returns the renter to. Public, because one session serves both a counter that
 * opened it and a renter sent the link: a session has a single redirect, fixed when it opens.
 */
export const INSURANCE_RETURN_PATH = '/insurance/return'

/** The redirect URI for a session opened from `location`, which staff are taken back to. */
export function insuranceReturnUri(location: Pick<Location, 'origin' | 'pathname' | 'search'>) {
  const returnTo = encodeURIComponent(`${location.pathname}${location.search}`)
  return `${location.origin}${INSURANCE_RETURN_PATH}?returnTo=${returnTo}`
}

/**
 * Where staff go back to from a return tab that could not close. Only a path on this site: the
 * value arrives in the URL, so a full address here would turn the page into an open redirect.
 */
export function insuranceReturnTo(search: string): string {
  const returnTo = new URLSearchParams(search).get('returnTo') ?? ''
  return returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/app/verification'
}
