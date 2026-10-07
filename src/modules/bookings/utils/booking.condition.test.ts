import { describe, expect, it } from 'vitest'
import {
  awaitsReturnReadings,
  overMileage,
  checkOdometer,
  recordedStages,
  screenConditionPhotos,
} from './booking.condition'

describe('checkOdometer', () => {
  it('reads a whole number of miles, with or without thousands grouped', () => {
    expect(checkOdometer('12480')).toEqual({ odometer: 12480 })
    expect(checkOdometer(' 12,480 ')).toEqual({ odometer: 12480 })
    expect(checkOdometer('12.480')).toEqual({ odometer: 12480 })
    expect(checkOdometer('0')).toEqual({ odometer: 0 })
  })

  it('refuses what an odometer cannot show', () => {
    for (const text of ['', '  ', '-5', '12k', '1e4', '12345678']) {
      expect(checkOdometer(text)).toEqual({ error: 'invalid' })
    }
  })

  it('refuses a separator that is not grouping thousands, rather than dropping it', () => {
    // A tenth of a mile, typed as the dash shows it: without the dot it would record 124,805.
    for (const text of ['12480.5', '12,48', '1,2480', '12,480.5']) {
      expect(checkOdometer(text)).toEqual({ error: 'invalid' })
    }
    expect(checkOdometer('1.234.567')).toEqual({ odometer: 1234567 })
  })

  it('refuses a return reading below the pickup one, and takes the same reading', () => {
    expect(checkOdometer('12479', 12480)).toEqual({ error: 'belowPickup' })
    expect(checkOdometer('12480', 12480)).toEqual({ odometer: 12480 })
  })
})

describe('recordedStages', () => {
  const photo = (id: string, stage: 'pickup' | 'return') => ({ id, stage, name: `${id}.jpg`, url: id })
  const READ = { odometer: 12480, fuelLevel: 6 } as const

  it('leaves out photos of a handover that has not been recorded', () => {
    const photos = [photo('a', 'pickup'), photo('b', 'return')]

    expect(recordedStages(undefined, undefined, photos)).toEqual([])
    expect(recordedStages(READ, undefined, photos).map((entry) => entry.stage)).toEqual(['pickup'])
  })

  it('shows a recorded handover only when it has a note or a photo', () => {
    expect(recordedStages(READ, READ, [])).toEqual([])
    expect(recordedStages(READ, { ...READ, notes: 'Dent in the door' }, [photo('a', 'pickup')])).toEqual([
      { stage: 'pickup', notes: undefined, photos: [photo('a', 'pickup')] },
      { stage: 'return', notes: 'Dent in the door', photos: [] },
    ])
  })
})

describe('overMileage', () => {
  const OUT = { odometer: 12000, fuelLevel: 8 } as const
  const back = (odometer: number) => ({ odometer, fuelLevel: 8 }) as const

  it('prices the miles past the allowance at the rate the rental was booked at', () => {
    expect(overMileage(OUT, back(12640), 600, 0.45)).toEqual({ miles: 40, amount: 18 })
    // To the cent: 33 miles at $0.35 is $11.55, not 11.549999.
    expect(overMileage(OUT, back(12633), 600, 0.35)).toEqual({ miles: 33, amount: 11.55 })
  })

  it('charges nothing within the allowance, on unlimited mileage, or with no rate set', () => {
    expect(overMileage(OUT, back(12600), 600, 0.45)).toBeUndefined()
    expect(overMileage(OUT, back(19000), null, 0.45)).toBeUndefined()
    expect(overMileage(OUT, back(12640), 600, undefined)).toBeUndefined()
  })

  it('has nothing to work from until both ends are read', () => {
    expect(overMileage(undefined, back(12640), 600, 0.45)).toBeUndefined()
    expect(overMileage(OUT, undefined, 600, 0.45)).toBeUndefined()
  })
})

describe('awaitsReturnReadings', () => {
  const OUT = { pickedUpAt: '2026-10-07T21:27:00Z' }

  it('is only while the car is out', () => {
    expect(awaitsReturnReadings({}, false)).toBe(false)
    expect(awaitsReturnReadings(OUT, false)).toBe(true)
    expect(awaitsReturnReadings({ ...OUT, returnedAt: '2026-10-08T14:30:00Z' }, false)).toBe(false)
  })

  it('is over once the booking is closed or cancelled, when nothing more will be read', () => {
    expect(awaitsReturnReadings(OUT, true)).toBe(false)
  })
})

describe('screenConditionPhotos', () => {
  const photo = (name: string, type = 'image/jpeg', size = 1024) => ({ name, type, size })

  it('says why each file it leaves out was left out', () => {
    const files = [
      photo('front.jpg'),
      photo('scan.heic', 'image/heic'),
      photo('huge.png', 'image/png', 10 * 1024 * 1024 + 1),
      photo('rear.webp', 'image/webp'),
      photo('side.jpg'),
    ]

    const { accepted, rejected } = screenConditionPhotos(files, 2)

    expect(accepted.map((file) => file.name)).toEqual(['front.jpg', 'rear.webp'])
    expect(rejected).toEqual([
      { name: 'scan.heic', reason: 'type' },
      { name: 'huge.png', reason: 'size' },
      { name: 'side.jpg', reason: 'limit' },
    ])
  })

  it('leaves out an empty file, which the API refuses along with the whole handover', () => {
    const { accepted, rejected } = screenConditionPhotos([photo('blank.jpg', 'image/jpeg', 0)], 2)

    expect(accepted).toEqual([])
    expect(rejected).toEqual([{ name: 'blank.jpg', reason: 'empty' }])
  })

  it('takes nothing once the handover has its full set', () => {
    expect(screenConditionPhotos([photo('one.jpg')], 0).accepted).toEqual([])
  })
})
