import { ZONE_COUNTRIES } from './timezones.data'

export interface TimezoneOption {
  zone: string
  label: string
  /** Minutes ahead of UTC on the day the list was built. */
  offset: number
}

const ZONES = [...ZONE_COUNTRIES.map(([zone]) => zone), 'UTC']

// The browser resolves any name to its own canonical one ("Asia/Kolkata" and "Asia/Calcutta" alike),
// which is how a stored or browser-reported alias finds its zone in the list.
const icuName = (zone: string) => new Intl.DateTimeFormat('en', { timeZone: zone }).resolvedOptions().timeZone
let byIcuName: Map<string, string> | undefined

/** The listed zone a name stands for, or undefined for a name the database does not know. */
export function matchTimezone(name: string | undefined): string | undefined {
  if (!name) return undefined
  byIcuName ??= new Map(ZONES.map((zone) => [icuName(zone), zone]))
  try {
    return byIcuName.get(icuName(name))
  } catch {
    return undefined
  }
}

/** The browser's own zone as listed; a browser may report an old name, such as "Asia/Calcutta". */
export function browserTimezone(): string {
  return matchTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? ''
}

export function zonesOf(country: string | undefined): string[] {
  return ZONE_COUNTRIES.filter(([, code]) => code === country).map(([zone]) => zone)
}

/**
 * The zone to hold once the operating country is known. A zone from another country is dropped:
 * a one-zone country fills itself in, and a country with several is left for the owner to choose.
 */
export function timezoneForCountry(current: string, country: string): string {
  const zones = zonesOf(country)
  if (zones.length === 0 || zones.includes(current)) return current
  return zones.length === 1 ? zones[0] : ''
}

function offsetMinutes(gmt: string): number {
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(gmt)
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0)
  return match[1] === '-' ? -minutes : minutes
}

/** "America/Indiana/Knox" reads as "Knox, Indiana". */
function placeOf(zone: string): string {
  const [, ...parts] = zone.split('/')
  return (parts.length ? parts.reverse() : [zone]).map((part) => part.replaceAll('_', ' ')).join(', ')
}

function optionFor(zone: string, language: string, now: Date): TimezoneOption {
  const part = (style: Intl.DateTimeFormatOptions['timeZoneName']) =>
    new Intl.DateTimeFormat(language, { timeZone: zone, timeZoneName: style })
      .formatToParts(now)
      .find((p) => p.type === 'timeZoneName')?.value ?? ''
  const gmt = part('shortOffset')
  const generic = part('longGeneric')
  const place = placeOf(zone)
  // Zones with no common name come back as a bare offset, which the label already carries.
  const named = generic && !generic.startsWith('GMT') && generic !== place
  const label = named
    ? `${generic.charAt(0).toLocaleUpperCase(language)}${generic.slice(1)} — ${place} (${gmt})`
    : `${place} (${gmt})`
  return { zone, label, offset: offsetMinutes(gmt) }
}

// Two Intl formatters a zone make the labels the costly part; a change of country only re-sorts.
const labelled = new Map<string, TimezoneOption[]>()

function labelledZones(language: string, now: Date): TimezoneOption[] {
  // Per day as well: an offset, and so a label, moves when daylight saving starts or ends.
  const key = `${language}|${now.toDateString()}`
  let options = labelled.get(key)
  if (!options) {
    options = ZONES.map((zone) => optionFor(zone, language, now))
    labelled.set(key, options)
  }
  return options
}

/**
 * Every zone, labelled the way people search for it. The operating country's come first, east to
 * west; the rest follow by offset, so a typed "eastern" or "chicago" finds its zone either way.
 */
export function timezoneOptions(language: string, country?: string, now = new Date()): TimezoneOption[] {
  const home = new Set(zonesOf(country))
  const options = labelledZones(language, now)
  const first = options.filter((o) => home.has(o.zone)).sort((a, b) => b.offset - a.offset)
  const rest = options
    .filter((o) => !home.has(o.zone))
    .sort((a, b) => a.offset - b.offset || a.label.localeCompare(b.label, language))
  return [...first, ...rest]
}
