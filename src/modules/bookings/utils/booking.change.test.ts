import { afterEach, describe, expect, it } from 'vitest'
import { VEHICLES_SEED } from '@/modules/vehicles/mock/vehicle.mock'
import type { Vehicle } from '@/modules/vehicles/types/vehicle.types'
import { useOrganizationStore } from '@/state/organization.store'
import { ApiError } from '@/types/api'
import type { OrganizationMembership } from '@/types/user'
import type { BookedInterval, ChangeQuote } from '../types/booking.types'
import {
  blockedPickupDays,
  changeEffects,
  changeError,
  changeMoney,
  chosenWindow,
  datesRequest,
  driversRequest,
  holdsWindow,
  lastReturnDay,
  nearestFreeTime,
  otherHolds,
  pickupBlocked,
  returnBlocked,
  startingDrivers,
  swapOptions,
  tripChoice,
  windowClash,
  windowProblem,
  withDate,
} from './booking.change'

/** Built from local parts, as the fields are read, so the suite passes in any time zone. */
const at = (day: number, hour = 10, minute = 0, second = 0) =>
  new Date(2026, 9, day, hour, minute, second).toISOString()

const BOOKING = { reference: 'BK-1', vehicleId: 'v1', pickupAt: at(20), returnAt: at(24) }
const NOW = new Date(2026, 9, 13, 9)

const QUOTE: ChangeQuote = {
  pickupAt: at(20),
  returnAt: at(26),
  vehicleId: 'v1',
  vehicleName: 'Toyota Camry',
  vehiclePlate: 'ABC1234',
  previousTotal: 235.4,
  total: 353.1,
  lines: [],
  previousDeposit: 350,
  deposit: 350,
  balance: 353.1,
  overpaid: 0,
  voidsAgreement: false,
  withdrawsLink: false,
  releasesDeposit: false,
  emailsRenter: true,
}

describe('tripChoice and chosenWindow', () => {
  it('shows the booking’s window in the fields and reads it back as the same instants', () => {
    const choice = tripChoice(BOOKING)

    expect(choice).toEqual({
      pickupDate: '2026-10-20',
      pickupTime: '10:00',
      returnDate: '2026-10-24',
      returnTime: '10:00',
    })
    expect(chosenWindow(choice)).toEqual({ pickupAt: BOOKING.pickupAt, returnAt: BOOKING.returnAt })
  })

  it('names no window while a field is empty', () => {
    expect(chosenWindow({ ...tripChoice(BOOKING), returnDate: '' })).toBeUndefined()
    expect(chosenWindow({ ...tripChoice(BOOKING), pickupTime: '' })).toBeUndefined()
  })
})

describe('windowProblem', () => {
  it('passes a window that is in order and still ahead', () => {
    expect(windowProblem({ pickupAt: at(20), returnAt: at(24) }, NOW)).toBeUndefined()
  })

  it('refuses a return at or before the pickup', () => {
    expect(windowProblem({ pickupAt: at(20), returnAt: at(20) }, NOW)).toBe('notOrdered')
    expect(windowProblem({ pickupAt: at(20), returnAt: at(19) }, NOW)).toBe('notOrdered')
  })

  it('refuses a rental already over, but not one whose pickup is a little behind the clock', () => {
    expect(windowProblem({ pickupAt: at(10), returnAt: at(12) }, NOW)).toBe('inPast')
    expect(windowProblem({ pickupAt: at(13, 8), returnAt: at(15) }, NOW)).toBeUndefined()
  })

  it('refuses more than a year', () => {
    const farOff = new Date(2027, 9, 22, 10).toISOString()
    expect(windowProblem({ pickupAt: at(20), returnAt: farOff }, NOW)).toBe('tooLong')
  })
})

describe('datesRequest', () => {
  const choice = tripChoice(BOOKING)

  it('asks for nothing while the dates are the booking’s own', () => {
    expect(datesRequest(choice, BOOKING)).toBeUndefined()
  })

  it('sends only the end that moved', () => {
    expect(datesRequest({ ...choice, returnDate: '2026-10-26' }, BOOKING)).toEqual({ returnAt: at(26) })
    expect(datesRequest({ ...choice, pickupTime: '12:30' }, BOOKING)).toEqual({ pickupAt: at(20, 12, 30) })
  })

  it('sends both when the whole rental shifts', () => {
    const shifted = { ...choice, pickupDate: '2026-10-22', returnDate: '2026-10-26' }
    expect(datesRequest(shifted, BOOKING)).toEqual({ pickupAt: at(22), returnAt: at(26) })
  })

  it('does not read a booking made to the second as moved by its own seconds', () => {
    const toTheSecond = { ...BOOKING, pickupAt: at(20, 10, 0, 42) }
    expect(datesRequest(tripChoice(toTheSecond), toTheSecond)).toBeUndefined()
  })
})

describe('windowClash', () => {
  const interval = (reference: string, vehicleId: string, from: string, to: string): BookedInterval => ({
    reference,
    vehicleId,
    plate: 'ABC1234',
    from,
    to,
  })
  const schedule = [
    interval('BK-1', 'v1', at(20), at(24)),
    interval('BK-2', 'v1', at(25), at(27)),
    interval('BK-3', 'v2', at(20), at(30)),
  ]

  it('names the next booking on the same car that the window runs into', () => {
    expect(windowClash(schedule, BOOKING)?.reference).toBe('BK-2')
  })

  it('does not count the booking’s own dates, or another car’s', () => {
    const own = [schedule[0], schedule[2]]
    expect(windowClash(own, BOOKING)).toBeUndefined()
  })

  it('takes the API’s word for a car still out, whose own dates ended before the window', () => {
    // Listed for this window because it is not back, though it was due on the 18th.
    const late = [interval('BK-4', 'v1', at(15), at(18))]
    expect(windowClash(late, BOOKING)?.reference).toBe('BK-4')
  })

  it('has nothing to check once the booking’s vehicle is deleted', () => {
    const orphan = { reference: 'BK-1', vehicleId: undefined }
    expect(windowClash(schedule, orphan)).toBeUndefined()
  })
})

describe('the days another rental takes from the calendars', () => {
  const held = (reference: string, from: string, to: string): BookedInterval => ({
    reference,
    vehicleId: 'v1',
    plate: 'ABC1234',
    from,
    to,
  })
  // Out from the 26th at 10:00 to the 29th at 10:00.
  const NEXT = held('BK-2', at(26), at(29))

  it('leaves the booking’s own dates and other cars out of what is in its way', () => {
    const schedule = [held('BK-1', at(20), at(24)), NEXT, { ...NEXT, reference: 'BK-3', vehicleId: 'v2' }]

    expect(otherHolds(schedule, BOOKING)).toEqual([NEXT])
    expect(otherHolds(schedule, { reference: 'BK-1', vehicleId: undefined })).toEqual([])
  })

  it('strikes out of the pickup calendar only the days with no hour left', () => {
    // The 26th is free until 10:00 and the 29th from 10:00: only the days between are gone.
    expect(blockedPickupDays([NEXT])).toEqual(['2026-10-27', '2026-10-28'])
  })

  it('strikes out a day two rentals cover between them, back to back', () => {
    const morning = held('BK-5', at(1, 0), at(1, 12))
    const rest = held('BK-6', at(1, 12), at(2, 0))

    expect(blockedPickupDays([morning, rest])).toEqual(['2026-10-01'])
    expect(blockedPickupDays([morning])).toEqual([])
  })

  it('takes from a day’s pickup times the hours another rental has the car', () => {
    const taken = (date: string, time: string) => pickupBlocked([NEXT], date, time)

    expect([taken('2026-10-26', '09:30'), taken('2026-10-26', '10:00')]).toEqual([false, true])
    // Back at 10:00 on the 29th: free from then, and not half an hour before.
    expect([taken('2026-10-29', '09:30'), taken('2026-10-29', '10:00')]).toEqual([true, false])
  })

  it('lets the return fall up to the day the next rental begins', () => {
    const before = held('BK-0', at(10), at(14))
    const later = held('BK-4', at(30), at(31))

    expect(lastReturnDay([later, before, NEXT], at(20))).toBe('2026-10-26')
    expect(lastReturnDay([before], at(20))).toBeUndefined()
    // Picked up as the last one comes back: only what follows limits the return.
    expect(lastReturnDay([NEXT, later], at(29))).toBe('2026-10-30')
  })

  it('takes from a day’s return times those not after the pickup, or past the next rental’s start', () => {
    const taken = (date: string, time: string) => returnBlocked([NEXT], at(25), date, time)

    // Picked up on the 25th at 10:00: nothing at or before that hour.
    expect([taken('2026-10-25', '10:00'), taken('2026-10-25', '10:30')]).toEqual([true, false])
    // Back by 10:00 on the 26th is in time for a car that leaves again at 10:00.
    expect([taken('2026-10-26', '10:00'), taken('2026-10-26', '10:30')]).toEqual([false, true])
  })

  it('moves an hour that is taken to the nearest one that is free', () => {
    const after10 = (time: string) => time < '10:00'
    const upTo10 = (time: string) => time > '10:00'

    expect(nearestFreeTime('09:00', after10)).toBe('10:00')
    expect(nearestFreeTime('11:00', upTo10)).toBe('10:00')
    expect(nearestFreeTime('14:30', after10)).toBe('14:30')
    // Nothing free to move to: left as it is, for the field to show as wrong.
    expect(nearestFreeTime('09:00', () => true)).toBe('09:00')
  })

  it('keeps the hour when a day is picked, unless that hour is taken on it', () => {
    const choice = tripChoice(BOOKING)

    // The 29th at 10:00 is the moment the car is back: free.
    expect(withDate(choice, 'pickup', '2026-10-29', [NEXT]).pickupTime).toBe('10:00')
    // The 26th at 10:00 is when it leaves: the last free pickup that day is 09:30.
    expect(withDate(choice, 'pickup', '2026-10-26', [NEXT])).toMatchObject({
      pickupDate: '2026-10-26',
      pickupTime: '09:30',
    })
    // A return on the 26th has to be in by 10:00, so a later hour comes back to it.
    const late = { ...choice, returnTime: '15:00' }
    expect(withDate(late, 'return', '2026-10-26', [NEXT])).toMatchObject({
      returnDate: '2026-10-26',
      returnTime: '10:00',
    })
    expect(withDate(late, 'return', '2026-10-25', [NEXT]).returnTime).toBe('15:00')
  })
})

describe("a change of dates on the company's clock, from a browser on another", () => {
  // Honolulu keeps one offset all year: 10:00 there is 20:00 UTC, whatever this machine is set to.
  const hnl = (day: number, hour = 10) => new Date(Date.UTC(2026, 9, day, hour + 10)).toISOString()
  const RENTAL = { reference: 'BK-1', vehicleId: 'v1', pickupAt: hnl(20), returnAt: hnl(24) }
  const NEXT: BookedInterval = {
    reference: 'BK-2',
    vehicleId: 'v1',
    plate: 'ABC1234',
    from: hnl(26),
    to: hnl(29),
  }

  const atTheCompany = () =>
    useOrganizationStore.setState({ membership: { timezone: 'Pacific/Honolulu' } as OrganizationMembership })
  afterEach(() => useOrganizationStore.setState({ membership: null }))

  it('fills the fields with the hour at the company, and reads them back as the same instants', () => {
    atTheCompany()
    const choice = tripChoice(RENTAL)

    expect(choice).toEqual({
      pickupDate: '2026-10-20',
      pickupTime: '10:00',
      returnDate: '2026-10-24',
      returnTime: '10:00',
    })
    expect(chosenWindow(choice)).toEqual({ pickupAt: RENTAL.pickupAt, returnAt: RENTAL.returnAt })
  })

  it('moves only the day when only the day is changed', () => {
    atTheCompany()
    const choice = tripChoice(RENTAL)

    // Filled from one clock and saved on another, this also moved the hour.
    expect(datesRequest({ ...choice, returnDate: '2026-10-26' }, RENTAL)).toEqual({ returnAt: hnl(26) })
  })

  it("ends the return calendar on the company's day the next rental begins", () => {
    atTheCompany()

    expect(lastReturnDay([NEXT], RENTAL.pickupAt)).toBe('2026-10-26')
  })

  it("strikes out the company's days a rental covers", () => {
    atTheCompany()
    const allDay = { ...NEXT, from: hnl(26, 0), to: hnl(27, 0) }

    expect(blockedPickupDays([NEXT])).toEqual(['2026-10-27', '2026-10-28'])
    expect(blockedPickupDays([allDay])).toEqual(['2026-10-26'])
  })

  it("reads rentals from the start of the company's today", () => {
    atTheCompany()

    // 22:00 on the 13th in Honolulu, already the 14th in UTC and further east.
    expect(holdsWindow(new Date(hnl(13, 22))).from).toBe(hnl(13, 0))
  })
})

describe('swapOptions', () => {
  const [own, sameBranch, orlando, tampa] = VEHICLES_SEED
  const booking = { ...BOOKING, vehicleId: own.id, pickupLocation: own.location }
  const fleet = [tampa, orlando, own, sameBranch]

  it('leaves out the booking’s own car and lists its branch’s first', () => {
    const options = swapOptions(fleet, [], booking)

    expect(options.map((option) => option.vehicle.id)).toEqual([sameBranch.id, tampa.id, orlando.id])
    expect(options.every((option) => option.bookedUntil === undefined)).toBe(true)
  })

  it('marks a car taken in the booking’s window with when it is back', () => {
    const taken: BookedInterval = {
      reference: 'BK-9',
      vehicleId: orlando.id,
      plate: orlando.plate,
      from: at(23),
      to: at(28),
    }
    const before: BookedInterval = { ...taken, vehicleId: tampa.id, from: at(15), to: at(20) }

    const options = swapOptions(fleet, [taken, before], booking)

    const option = (id: string) => options.find(({ vehicle }) => vehicle.id === id)
    expect(option(orlando.id)).toEqual({ vehicle: orlando, bookedUntil: at(28) })
    // Its dates ended as this rental starts, yet the API lists it: the car is not back.
    expect(option(tampa.id)).toEqual({ vehicle: tampa, outOn: 'BK-9' })
    expect(option(sameBranch.id)).toEqual({ vehicle: sameBranch })
  })

  it('offers a car out today that is back by the booking’s dates, but none in the workshop', () => {
    const car = (vehicle: Vehicle, status: Vehicle['status']) => ({ ...vehicle, status })
    const mixed = [
      car(sameBranch, 'On rent'),
      car(orlando, 'Maintenance'),
      car(tampa, 'Out of service'),
      car(VEHICLES_SEED[4], 'Archived'),
    ]

    expect(swapOptions(mixed, [], booking).map((option) => option.vehicle.id)).toEqual([sameBranch.id])
  })
})

describe('changeMoney', () => {
  it('says what is left to pay, or what is owed back', () => {
    expect(changeMoney({ balance: 117.7, overpaid: 0 })).toEqual({ kind: 'toPay', amount: 117.7 })
    expect(changeMoney({ balance: 0, overpaid: 58.85 })).toEqual({ kind: 'toRefund', amount: 58.85 })
    // Paid to the cent: nothing to pay, said as a figure rather than left blank.
    expect(changeMoney({ balance: 0, overpaid: 0 })).toEqual({ kind: 'toPay', amount: 0 })
  })
})

describe('changeEffects', () => {
  it('has nothing to say when the change takes nothing back and the renter is emailed', () => {
    expect(changeEffects(QUOTE)).toEqual([])
  })

  it('lists everything the change undoes, and the refund the counter then owes', () => {
    const quote = {
      ...QUOTE,
      voidsAgreement: true,
      withdrawsLink: true,
      releasesDeposit: true,
      overpaid: 58.85,
    }
    expect(changeEffects(quote)).toEqual(['agreement', 'link', 'hold', 'refund'])
  })

  it('says so when no email will go, so the counter tells the renter itself', () => {
    expect(changeEffects({ ...QUOTE, emailsRenter: false })).toEqual(['noEmail'])
  })
})

describe('a change of drivers', () => {
  const SAM = { id: 'd1', name: 'Sam Okafor', licenceNumber: 'FL 9911', pricePerDay: 12 }
  const DANA = { id: 'd2', name: 'Dana Ortiz', licenceNumber: 'FL 2204', pricePerDay: 12 }

  it('starts on the drivers the booking has, or on one to fill in when it has none', () => {
    expect(startingDrivers([SAM], () => 'new')).toEqual([SAM])
    expect(startingDrivers([], () => 'new')).toEqual([
      { id: 'new', name: '', licenceNumber: '', pricePerDay: 12 },
    ])
  })

  it('asks for nothing while the list is as the booking has it', () => {
    expect(driversRequest([SAM, DANA], [SAM, DANA])).toBeUndefined()
    // Spaces typed around a name are not a change: the API stores it without them.
    expect(driversRequest([{ ...SAM, name: ' Sam Okafor ' }], [SAM])).toBeUndefined()
  })

  it('sends the whole list when a driver is added, taken off, or changed', () => {
    expect(driversRequest([SAM, DANA], [SAM])).toEqual({ additionalDrivers: [SAM, DANA] })
    expect(driversRequest([], [SAM])).toEqual({ additionalDrivers: [] })
    const waived = { ...SAM, pricePerDay: 0 }
    expect(driversRequest([waived], [SAM])).toEqual({ additionalDrivers: [waived] })
    const corrected = { ...SAM, licenceNumber: 'FL 9912' }
    expect(driversRequest([corrected], [SAM])).toEqual({ additionalDrivers: [corrected] })
  })

  it('reads a rate cleared in its field as no charge, never as a figure the API cannot take', () => {
    const cleared = { ...SAM, pricePerDay: Number.NaN }
    expect(driversRequest([cleared], [SAM])).toEqual({ additionalDrivers: [{ ...SAM, pricePerDay: 0 }] })
  })
})

describe('changeError', () => {
  it('knows the refusals the dialogs have words for, and leaves the rest to the API’s message', () => {
    const refused = (code: string) => new ApiError('conflict', 'refused', { status: 409, code })

    expect(changeError(refused('vehicle_unavailable'))).toBe('vehicle_unavailable')
    expect(changeError(refused('quote_changed'))).toBe('quote_changed')
    expect(changeError(refused('something_new'))).toBeUndefined()
    expect(changeError(new Error('offline'))).toBeUndefined()
  })
})
