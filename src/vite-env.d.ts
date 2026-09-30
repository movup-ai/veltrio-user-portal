/// <reference types="google.maps" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_USE_MOCKS: string
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  /** Root domain for customer-portal links, e.g. `veltrio.com`. */
  readonly VITE_CUSTOMER_PORTAL_DOMAIN?: string
  /**
   * Google Maps key with the Places API enabled, for the location address picker. Absent in
   * development and in CI: the picker falls back to a plain text field.
   */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  /** `true` once the API can email or text a renter their insurance link. */
  readonly VITE_INSURANCE_LINK_DELIVERY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
