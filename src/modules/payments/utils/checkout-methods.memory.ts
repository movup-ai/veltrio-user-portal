import type { CheckoutMethod, CheckoutMethodStatus } from '../types/payment-account.types'

const TYPES: readonly CheckoutMethod[] = ['card', 'apple_pay', 'google_pay', 'link']

const key = (scope: string) => `veltrio.checkout_methods.${scope}`

/**
 * Names one company's linked Stripe account. A different account, such as one set up in place
 * of a disconnected one, starts with nothing remembered rather than the old one's methods.
 */
export function methodsScope(organizationId: string | undefined, connectedAt: string | undefined) {
  return organizationId && connectedAt ? `${organizationId}:${connectedAt}` : undefined
}

function isStatus(value: unknown): value is CheckoutMethodStatus {
  const { type, available } = (value ?? {}) as Partial<CheckoutMethodStatus>
  return TYPES.includes(type as CheckoutMethod) && typeof available === 'boolean'
}

/** The methods as Stripe last gave them for this account, to show while it is asked again. */
export function recallMethods(scope: string | undefined): CheckoutMethodStatus[] | undefined {
  if (!scope) return undefined
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key(scope)) ?? 'null')
    // All or nothing: a list this build cannot read whole is better not shown than shown wrong.
    return Array.isArray(stored) && stored.length > 0 && stored.every(isStatus) ? stored : undefined
  } catch {
    return undefined
  }
}

export function rememberMethods(scope: string | undefined, methods: CheckoutMethodStatus[]): void {
  if (!scope) return
  try {
    localStorage.setItem(
      key(scope),
      JSON.stringify(methods.map(({ type, available }) => ({ type, available }))),
    )
  } catch {
    // Storage is full or blocked: the row then just waits for Stripe, as it always did.
  }
}
