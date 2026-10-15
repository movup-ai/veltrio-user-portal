import { COMPANY } from '../shared/sunstate.ts'

// Stands in for `@clerk/clerk-react`, signed in as the owner. Only what the captured pages read:
// `useMe` asks `useAuth`, and the sidebar's account menu asks `useClerk`.
const auth = { isLoaded: true, isSignedIn: true, userId: COMPANY.owner.id }
const clerk = { openUserProfile: () => {}, signOut: async () => {} }

export const useAuth = () => auth
export const useClerk = () => clerk
