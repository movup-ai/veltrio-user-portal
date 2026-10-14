import { describe, expect, it } from 'vitest'
import { matchTimezone, timezoneForCountry, timezoneOptions, zonesOf } from './timezones'

// Mid-October: the US is on daylight time, so New York reads GMT-4.
const OCTOBER = new Date('2026-10-15T12:00:00Z')

describe('timezoneOptions', () => {
  const options = timezoneOptions('en', 'US', OCTOBER)

  it('lists every zone in the database, once, under a label of its own', () => {
    expect(options).toHaveLength(419)
    expect(new Set(options.map((o) => o.zone)).size).toBe(419)
    expect(new Set(options.map((o) => o.label)).size).toBe(419)
  })

  it('puts every US zone first, east to west, under names people search for', () => {
    const us = options.slice(0, zonesOf('US').length).map((o) => o.zone)

    expect(new Set(us)).toEqual(new Set(zonesOf('US')))
    expect(us[0]).toBe('America/New_York')
    expect(us.at(-1)).toBe('Pacific/Honolulu')
    expect(options.find((o) => o.zone === 'America/New_York')?.label).toBe('Eastern Time — New York (GMT-4)')
    expect(options.find((o) => o.zone === 'America/Indiana/Knox')?.label).toBe(
      'Central Time — Knox, Indiana (GMT-5)',
    )
    // Arizona keeps standard time all year, and the label says so.
    expect(options.find((o) => o.zone === 'America/Phoenix')?.label).toBe(
      'Mountain Standard Time — Phoenix (GMT-7)',
    )
  })

  it('carries all 29 US zones, the Indiana, Kentucky and North Dakota ones included', () => {
    expect(zonesOf('US')).toHaveLength(29)
    expect(zonesOf('US')).toEqual(
      expect.arrayContaining([
        'America/Indiana/Indianapolis',
        'America/Kentucky/Louisville',
        'America/North_Dakota/Center',
        'America/Adak',
        'Pacific/Honolulu',
      ]),
    )
  })

  it('names zones in the reader’s language', () => {
    const spanish = timezoneOptions('es', 'US', OCTOBER)

    expect(spanish.find((o) => o.zone === 'America/Chicago')?.label).toMatch(/^Hora central/)
  })
})

describe('matchTimezone', () => {
  it.each([
    ['Asia/Calcutta', 'Asia/Kolkata'],
    ['America/Indianapolis', 'America/Indiana/Indianapolis'],
    ['Europe/Kiev', 'Europe/Kyiv'],
    ['America/New_York', 'America/New_York'],
  ])('finds %s, an old or current name, as %s', (name, zone) => {
    expect(matchTimezone(name)).toBe(zone)
  })

  it.each([undefined, '', 'Mars/Olympus'])('finds nothing for %j', (name) => {
    expect(matchTimezone(name)).toBeUndefined()
  })
})

describe('timezoneForCountry', () => {
  it('keeps a zone that belongs to the operating country', () => {
    expect(timezoneForCountry('America/Chicago', 'US')).toBe('America/Chicago')
  })

  it('fills in the only zone of a one-zone country', () => {
    expect(timezoneForCountry('Asia/Shanghai', 'CO')).toBe('America/Bogota')
  })

  it('leaves a several-zone country for the owner to choose, rather than keep a foreign zone', () => {
    // The browser's zone (here a laptop set to Shanghai) was kept for a Florida company.
    expect(timezoneForCountry('Asia/Shanghai', 'US')).toBe('')
  })
})
