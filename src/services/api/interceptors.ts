import type { AxiosInstance } from 'axios'
import { tokenStorage } from '@/services/storage/token-storage'
import { useAuthStore } from '@/state/auth.store'
import { normalizeApiError } from './errors'

export function attachInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    const token = tokenStorage.get()
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const apiError = normalizeApiError(error)

      if (apiError.kind === 'unauthorized') {
        useAuthStore.getState().logout()
      }

      return Promise.reject(apiError)
    },
  )
}
