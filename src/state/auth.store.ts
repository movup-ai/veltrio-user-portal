import { create } from 'zustand'
import { tokenStorage } from '@/services/storage/token-storage'
import type { User } from '@/types/user'

interface AuthState {
  user: User | null
  status: 'idle' | 'authenticated' | 'unauthenticated'
  setSession: (user: User, accessToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: tokenStorage.get() ? 'idle' : 'unauthenticated',

  setSession: (user, accessToken) => {
    tokenStorage.set(accessToken)
    set({ user, status: 'authenticated' })
  },

  logout: () => {
    tokenStorage.clear()
    set({ user: null, status: 'unauthenticated' })
  },
}))
