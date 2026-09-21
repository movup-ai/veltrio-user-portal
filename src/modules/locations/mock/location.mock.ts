/**
 * Branch names used by the not-yet-built bookings module. Locations themselves are real —
 * see `location.api.ts` — so anything that can call the API should, and this exists only for
 * mock bookings that need a plausible branch and desk agent.
 */
export interface MockBranch {
  name: string
  address: string
  manager: string
}

export const MOCK_BRANCHES: MockBranch[] = [
  { name: 'Miami Beach', address: '1440 Collins Ave, Miami Beach, FL 33139', manager: 'Camila Ortiz' },
  { name: 'Orlando Intl.', address: '9250 Jeff Fuqua Blvd, Orlando, FL 32827', manager: 'Nate Ferraro' },
  { name: 'Tampa Downtown', address: '310 E Kennedy Blvd, Tampa, FL 33602', manager: 'Priya Raman' },
  { name: 'Fort Lauderdale', address: '100 Terminal Dr, Fort Lauderdale, FL 33315', manager: 'Marcus Webb' },
]
