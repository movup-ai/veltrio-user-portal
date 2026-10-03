import type { Vehicle } from '../types/vehicle.types'

/**
 * Links into the customer-facing portal, which is a separate app served per tenant at
 * `<subdomain>.<domain>`. Nothing here routes inside this app.
 */
const DOMAIN = import.meta.env.VITE_CUSTOMER_PORTAL_DOMAIN ?? 'veltrio.com'

/** The company's own site, where renters land. */
export function siteUrl(subdomain: string): string {
  return `https://${subdomain}.${DOMAIN}`
}

export function fleetUrl(subdomain: string): string {
  return `${siteUrl(subdomain)}/vehicles`
}

export function vehicleUrl(subdomain: string, vehicle: Pick<Vehicle, 'uri'>): string {
  return `${fleetUrl(subdomain)}/${vehicle.uri}`
}

/** Falls back to a temporary textarea where the clipboard API is unavailable (http, old Safari). */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const field = document.createElement('textarea')
      field.value = text
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.appendChild(field)
      field.select()
      const copied = document.execCommand('copy')
      document.body.removeChild(field)
      return copied
    } catch {
      return false
    }
  }
}
