/** Dollars to whole cents, the unit the API stores and prices in. */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}

/**
 * `pct` percent of `cents`, rounded half-up to a whole cent. Worked in basis points so a rate
 * with two decimals (how the API stores one) rounds as the API's decimals do: in float, 0.29% of
 * $50.00 fell just under the half-cent and lost a cent the API charged.
 */
export function percentOfCents(cents: number, pct: number): number {
  const basisPoints = Math.round(pct * 100)
  return Math.round((cents * basisPoints) / 10_000)
}
