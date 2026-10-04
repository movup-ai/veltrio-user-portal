import type { Brand } from '../types/brand.types'

/**
 * The cached brand after a mutation answers, taking only the fields that mutation changed. Every
 * response is the whole brand as the server saw it then, so writing one back wholesale lets a
 * slow upload's answer undo a colour saved while it ran.
 */
export function mergeBrand(current: Brand | undefined, response: Brand, changed: (keyof Brand)[]): Brand {
  if (!current) return response
  return { ...current, ...Object.fromEntries(changed.map((key) => [key, response[key]])) }
}

/** `#RRGGBB`, either case, as the API takes it. */
export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim())
}

/** WCAG relative luminance of a `#RRGGBB` colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, 1 to 21. */
function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** White or near-black, whichever reads better on `background`: the label on a primary button. */
export function readableOn(background: string): string {
  return contrastRatio('#FFFFFF', background) >= contrastRatio('#111827', background) ? '#FFFFFF' : '#111827'
}
