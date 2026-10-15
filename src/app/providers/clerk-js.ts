/**
 * Pinned rather than left on "5": index.html preloads this exact script, and the floating tag
 * costs a redirect on every visit. Bump it with @clerk/clerk-react.
 */
export const CLERK_JS_VERSION = '5.128.0'

/** The instance's Frontend API host, which a publishable key carries base64-encoded. */
export function clerkFrontendApi(publishableKey: string | undefined): string | null {
  const encoded = /^pk_(?:test|live)_(.+)$/.exec(publishableKey ?? '')?.[1]
  if (!encoded) return null
  try {
    return atob(encoded).replace(/\$$/, '') || null
  } catch {
    return null
  }
}

/** The script ClerkProvider injects. The preload must name this same URL, or it is wasted. */
export function clerkJsUrl(frontendApi: string): string {
  return `https://${frontendApi}/npm/@clerk/clerk-js@${CLERK_JS_VERSION}/dist/clerk.browser.js`
}
