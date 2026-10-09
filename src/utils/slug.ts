/**
 * Derives a tenant subdomain from a company name. The rules mirror the backend's
 * `Subdomain` validator (app/modules/tenants/schemas.py) so the form can reject a
 * name before the request rather than surfacing a raw 422.
 */
export function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      // Strip the accents NFKD split off, so "Peña" becomes "pena", not "pen-a".
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 63)
      .replace(/^-+|-+$/g, '')
  )
}

/**
 * Subdomains the platform keeps for itself. Mirrors RESERVED_SUBDOMAINS in the API's
 * app/core/tenancy.py — the pattern alone let `app` or `portal` through to a bare 422.
 */
const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'docs',
  'help',
  'mail',
  'portal',
  'static',
  'status',
  'support',
  'www',
])

/** 3-63 characters of lowercase letters, digits and single hyphens, hyphen-free at both ends. */
export function isValidSubdomain(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(value) && !value.includes('--')
}

export function isReservedSubdomain(value: string): boolean {
  return RESERVED_SUBDOMAINS.has(value)
}

/**
 * The subdomain to register for a company, which onboarding picks without asking. Attempt 0
 * is the name itself; later attempts add a number, for when that one is taken.
 */
export function subdomainFor(companyName: string, attempt = 0): string {
  const slug = slugify(companyName)
  // A short, reserved or non-Latin name leaves nothing the API accepts, so it borrows a word.
  const usable = isValidSubdomain(slug) && !isReservedSubdomain(slug)
  const base = usable ? slug : [slug, 'rentals'].filter(Boolean).join('-')
  if (attempt === 0) return base

  const suffix = `-${attempt + 1}`
  return base.slice(0, 63 - suffix.length).replace(/-+$/, '') + suffix
}

/**
 * Mirrors the API's `Website` check: a bare host gets https://, and the host needs a dot.
 * Blank is fine - plenty of small rental companies have no site.
 */
export function isValidWebsite(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  try {
    const { hostname } = new URL(/^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`)
    return hostname.includes('.') && !hostname.endsWith('.')
  } catch {
    return false
  }
}
