/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_USE_MOCKS: string
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  /** Root domain for customer-portal links, e.g. `veltrio.com`. */
  readonly VITE_CUSTOMER_PORTAL_DOMAIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
