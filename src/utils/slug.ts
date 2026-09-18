/**
 * Derives a tenant subdomain from a company name. The rules mirror the backend's
 * `Subdomain` validator (app/modules/tenants/schemas.py) so the form can reject a
 * name before the request rather than surfacing a raw 422.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    // Strip the accents NFKD split off, so "Peña" becomes "pena", not "pen-a".
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 63)
    .replace(/^-+|-+$/g, '')
}

/** 3-63 characters of lowercase letters, digits and single hyphens, hyphen-free at both ends. */
export function isValidSubdomain(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(value) && !value.includes('--')
}
