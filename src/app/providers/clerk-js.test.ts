import { clerkJsScriptUrl } from '@clerk/shared/loadClerkJsScript'
import { describe, expect, it } from 'vitest'
import { CLERK_JS_VERSION, clerkFrontendApi, clerkJsUrl } from './clerk-js'

const KEY = `pk_test_${btoa('picked-mayfly-2648.clerk.accounts.dev$')}`

describe('clerk-js preload', () => {
  it('reads the Frontend API host out of a publishable key', () => {
    expect(clerkFrontendApi(KEY)).toBe('picked-mayfly-2648.clerk.accounts.dev')
    expect(clerkFrontendApi(`pk_live_${btoa('clerk.veltrio.io$')}`)).toBe('clerk.veltrio.io')
  })

  it.each([undefined, '', 'sk_test_abc', 'pk_test_%%%'])('finds no host in %j', (key) => {
    expect(clerkFrontendApi(key)).toBeNull()
  })

  it('preloads exactly the script ClerkProvider asks for', () => {
    // Clerk's own builder: a URL that differs by a character downloads the script twice.
    const injected = clerkJsScriptUrl({ publishableKey: KEY, clerkJSVersion: CLERK_JS_VERSION })

    expect(clerkJsUrl(clerkFrontendApi(KEY)!)).toBe(injected)
  })
})
