/**
 * Opening hours travel as minutes from midnight, so they sort and compare without a timezone.
 * Only the display is localized — 24-hour in Spanish, am/pm in English.
 */
export function formatMinutes(minutes: number, language: string): string {
  const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)
  return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function formatRange(opensAt: number, closesAt: number, language: string): string {
  return `${formatMinutes(opensAt, language)} – ${formatMinutes(closesAt, language)}`
}

/** `HH:MM` for a time input, which is always 24-hour regardless of locale. */
export function toTimeValue(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

export function fromTimeValue(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}
