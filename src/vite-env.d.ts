/// <reference types="google.maps" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  /** Root domain company sites hang off, for vehicle and payment links, e.g. `veltrio.autos`. */
  readonly VITE_CUSTOMER_PORTAL_DOMAIN?: string
  /**
   * Google Maps key with the Places API enabled, for the location address picker. Absent in
   * development and in CI: the picker falls back to a plain text field.
   */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  /** `true` once the API can email or text a renter their insurance link. */
  readonly VITE_INSURANCE_LINK_DELIVERY?: string
  /** Where a company writes for an Enterprise quote. Absent, the plan offers no contact button. */
  readonly VITE_SALES_EMAIL?: string
  /** The public Terms of Service and Privacy Policy. Until both are set, sign-up names neither. */
  readonly VITE_TERMS_URL?: string
  readonly VITE_PRIVACY_URL?: string
  /** Where errors are reported. Absent in development and in CI: nothing is sent. */
  readonly VITE_SENTRY_DSN?: string
  /** Names the deployment in Sentry, e.g. `staging`; the build mode when unset. */
  readonly VITE_SENTRY_ENVIRONMENT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
