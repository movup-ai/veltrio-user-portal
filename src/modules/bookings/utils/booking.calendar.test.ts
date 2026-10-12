import { describe, expect, it } from 'vitest'
import type {
  CalendarFilters,
  CalendarVehicle,
  CalendarView,
  TimelineView,
} from '../types/booking-calendar.types'
import { statusColors } from '@/components/data-display/status-colors'
import { BOOKING_STATUS_FILTERS, type Booking } from '../types/booking.types'
import {
  bookedVehiclesByDay,
  calendarColumns,
  calendarLook,
  calendarRange,
  calendarRows,
  calendarStatus,
  calendarTitle,
  filterCalendar,
  heatLevel,
  parseCalendarDay,
  parseCalendarView,
  shiftAnchor,
  timelineFraction,
  yearMonths,
} from './booking.calendar'

/** Local time throughout, as the calendar draws it, so the run-time zone cannot move a day. */
const at = (day: number, hour = 0, month = 8) => new Date(2026, month, day, hour)

const NOW = at(16, 12).getTime()

function booking(overrides: Partial<Booking> & { from: Date; to: Date }): Booking {
  const { from, to, ...rest } = overrides
  return {
    reference: 'BK-10001',
    status: 'Confirmed',
    customer: { name: 'Marisol Vega' },
    vehicleId: 'v1',
    vehicleName: 'Honda Accord',
    vehiclePlate: 'FL-AAA-1',
    pickupAt: from.toISOString(),
    returnAt: to.toISOString(),
    payment: { state: 'unpaid', paid: 0, refunded: 0 },
    contract: {},
    ...rest,
  } as Booking
}

const ACCORD: CalendarVehicle = {
  key: 'v1',
  id: 'v1',
  name: 'Honda Accord',
  plate: 'FL-AAA-1',
  location: 'Miami',
}
const CIVIC: CalendarVehicle = {
  key: 'v2',
  id: 'v2',
  name: 'Honda Civic',
  plate: 'FL-BBB-2',
  location: 'Tampa',
}

const SHOW_ALL: CalendarFilters = { search: '', location: 'All', hidden: new Set() }

const september = calendarColumns('month', calendarRange('month', at(16), 0))

describe('calendarRange', () => {
  it('spans the whole unit around the anchor, half-open', () => {
    expect(calendarRange('day', at(16, 15), 0)).toEqual({ from: at(16), to: at(17) })
    expect(calendarRange('month', at(16), 0)).toEqual({ from: at(1), to: at(1, 0, 9) })
    expect(calendarRange('year', at(16), 0)).toEqual({ from: new Date(2026, 0, 1), to: new Date(2027, 0, 1) })
  })

  it('starts the week on the day the locale does', () => {
    // 16 Sep 2026 is a Wednesday.
    expect(calendarRange('week', at(16), 0).from).toEqual(at(13))
    expect(calendarRange('week', at(16), 1).from).toEqual(at(14))
  })
})

describe('calendarTitle', () => {
  it('words the span each view shows', () => {
    const title = (view: CalendarView) => calendarTitle(view, calendarRange(view, at(16), 0), 'en-US')

    expect(title('day')).toBe('Wed, September 16, 2026')
    // Its last day, not the first of the next week the half-open range ends on.
    expect(title('week')).toMatch(/^Sep 13\s–\s19, 2026$/)
    expect(title('month')).toBe('September 2026')
    expect(title('year')).toBe('2026')
  })
})

describe('shiftAnchor', () => {
  it('steps by the unit on show', () => {
    expect(shiftAnchor('week', at(16), 1)).toEqual(at(23))
    expect(shiftAnchor('month', at(16), -1)).toEqual(at(16, 0, 7))
  })

  it('lands on the last day when the next month is shorter', () => {
    expect(shiftAnchor('month', new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28))
  })
})

describe('calendarColumns', () => {
  it('gives a day its hours and a month its days', () => {
    expect(calendarColumns('day', calendarRange('day', at(16), 0))).toHaveLength(24)
    expect(calendarColumns('week', calendarRange('week', at(16), 0))).toHaveLength(7)
    expect(september).toHaveLength(30)
    expect(september[15]).toEqual({ start: at(16), end: at(17) })
  })
})

describe('timelineFraction', () => {
  it('places an instant by its own column', () => {
    expect(timelineFraction(september, at(1).getTime())).toBe(0)
    expect(timelineFraction(september, at(16, 12).getTime())).toBeCloseTo(15.5 / 30)
  })

  it('is null outside the window, the end included', () => {
    expect(timelineFraction(september, at(31, 23, 7).getTime())).toBeNull()
    expect(timelineFraction(september, at(1, 0, 9).getTime())).toBeNull()
  })
})

describe('calendarStatus', () => {
  it('reads Ready once a confirmed booking is paid and signed', () => {
    const ready = booking({
      from: at(20),
      to: at(22),
      payment: { state: 'paid', paid: 100, refunded: 0 },
      contract: { signedAt: at(10).toISOString() },
    })

    expect(calendarStatus(ready, NOW)).toBe('Ready')
  })

  it('turns a car still out late into Overdue without a refetch', () => {
    const out = booking({ status: 'On rental', from: at(10), to: at(16, 11) })

    expect(calendarStatus(out, at(16, 10).getTime())).toBe('On rental')
    expect(calendarStatus(out, NOW)).toBe('Overdue')
  })

  it('tells a declined request from a cancelled rental', () => {
    const declined = booking({
      status: 'Cancelled',
      from: at(20),
      to: at(22),
      declined: { reason: 'other', at: at(12).toISOString(), restorable: true },
    })

    expect(calendarStatus(declined, NOW)).toBe('Declined')
  })
})

describe('calendarLook', () => {
  // Every badge the bookings list can show, which is every status a bar can have.
  const SHOWN = [...BOOKING_STATUS_FILTERS, 'Ready']

  it('colours a bar exactly as the bookings list colours that status', () => {
    for (const status of SHOWN) {
      const { bg, fg } = statusColors(status)

      expect(calendarLook(status), status).toMatchObject({ fill: bg, text: fg })
    }
  })

  it('outlines only a pending request, which holds no car yet', () => {
    expect(SHOWN.filter((status) => calendarLook(status).outlined)).toEqual(['Pending'])
  })
})

describe('calendarRows', () => {
  it('keeps an idle car as a row of its own', () => {
    const rows = calendarRows([ACCORD, CIVIC], [booking({ from: at(16), to: at(19) })], september, NOW)

    expect(rows.map((row) => [row.vehicle.key, row.bars.length, row.lanes])).toEqual([
      ['v1', 1, 1],
      ['v2', 0, 1],
    ])
  })

  it('sizes a bar to its share of the window', () => {
    const [row] = calendarRows([ACCORD], [booking({ from: at(16), to: at(19) })], september, NOW)

    expect(row.bars[0]).toMatchObject({ startsBefore: false, endsAfter: false, lane: 0 })
    expect(row.bars[0].start).toBeCloseTo(15 / 30)
    expect(row.bars[0].end).toBeCloseTo(18 / 30)
  })

  it('cuts a rental that runs past the window off at its edge', () => {
    const long = booking({ from: at(28, 0, 7), to: at(3, 0, 9) })
    const [row] = calendarRows([ACCORD], [long], september, NOW)

    expect(row.bars[0]).toMatchObject({ start: 0, end: 1, startsBefore: true, endsAfter: true })
  })

  it('leaves out a rental that only touches the window', () => {
    // Half-open: returned at the instant the month starts, it was never in the month.
    const before = booking({ from: at(28, 0, 7), to: at(1) })
    const [row] = calendarRows([ACCORD], [before], september, NOW)

    expect(row.bars).toEqual([])
  })

  it('stacks a request on dates another rental already holds', () => {
    const held = booking({ reference: 'BK-1', from: at(16), to: at(19) })
    const request = booking({ reference: 'BK-2', status: 'Pending', from: at(17), to: at(18) })
    const next = booking({ reference: 'BK-3', from: at(19), to: at(21) })
    const [row] = calendarRows([ACCORD], [next, request, held], september, NOW)

    expect(row.lanes).toBe(2)
    // Back to back is not a clash, so the rental that follows shares the first lane.
    expect(row.bars.map((bar) => [bar.booking.reference, bar.lane])).toEqual([
      ['BK-1', 0],
      ['BK-2', 1],
      ['BK-3', 0],
    ])
  })

  it('places both ends of a bar at the booked hour, in every view', () => {
    const trip = booking({ from: at(16, 9), to: at(16, 14) })
    const edges = (view: TimelineView) => {
      const columns = calendarColumns(view, calendarRange(view, at(16), 0))
      const [row] = calendarRows([ACCORD], [trip], columns, NOW)
      return [row.bars[0].start, row.bars[0].end]
    }
    const expectEdges = (view: TimelineView, start: number, end: number) => {
      expect(edges(view)[0], `${view} start`).toBeCloseTo(start, 10)
      expect(edges(view)[1], `${view} end`).toBeCloseTo(end, 10)
    }

    expectEdges('day', 9 / 24, 14 / 24)
    // The 16th is the fourth day of its week, and the sixteenth of its month.
    expectEdges('week', (3 + 9 / 24) / 7, (3 + 14 / 24) / 7)
    expectEdges('month', (15 + 9 / 24) / 30, (15 + 14 / 24) / 30)
  })

  it('ends an overdue rental at its booked return time, not at now', () => {
    // As reported: due back on the 10th at noon, still out days later, and drawn up to today.
    const late = booking({ status: 'On rental', from: at(1, 9), to: at(10, 12) })
    const now = at(14, 22).getTime()
    const week = (anchor: Date) => calendarColumns('week', calendarRange('week', anchor, 0))

    const [dueWeek] = calendarRows([ACCORD], [late], week(at(10)), now)
    expect(dueWeek.bars[0]).toMatchObject({
      status: 'Overdue',
      start: 0,
      startsBefore: true,
      endsAfter: false,
    })
    // Sunday the 6th to Thursday noon: four and a half of the week's seven days.
    expect(dueWeek.bars[0].end).toBeCloseTo(4.5 / 7, 10)

    const [thisWeek] = calendarRows([ACCORD], [late], week(at(14)), now)
    expect(thisWeek.bars).toEqual([])
  })

  it('gives a rental on a car no longer in the fleet a row after the rest', () => {
    const archived = booking({
      vehicleId: 'v9',
      vehicleName: 'Kia Rio',
      vehiclePlate: 'FL-ZZZ-9',
      from: at(5),
      to: at(6),
    })
    const deleted = booking({
      vehicleId: undefined,
      vehicleName: 'Fiat 500',
      vehiclePlate: 'FL-OLD-1',
      from: at(7),
      to: at(8),
    })
    const rows = calendarRows([ACCORD], [archived, deleted], september, NOW)

    expect(rows.map((row) => row.vehicle)).toEqual([
      ACCORD,
      { key: 'v9', id: 'v9', name: 'Kia Rio', plate: 'FL-ZZZ-9' },
      { key: 'Fiat 500|FL-OLD-1', id: undefined, name: 'Fiat 500', plate: 'FL-OLD-1' },
    ])
  })
})

describe('filterCalendar', () => {
  const accordTrip = booking({ reference: 'BK-1', from: at(16), to: at(19) })
  const civicTrip = booking({
    reference: 'BK-2',
    vehicleId: 'v2',
    vehicleName: 'Honda Civic',
    vehiclePlate: 'FL-BBB-2',
    customer: { name: 'Dana Ortiz' } as Booking['customer'],
    from: at(20),
    to: at(22),
  })
  const fleet = [ACCORD, CIVIC]
  const all = [accordTrip, civicTrip]

  const result = (filters: Partial<CalendarFilters>) => {
    const { vehicles, bookings } = filterCalendar(fleet, all, { ...SHOW_ALL, ...filters }, NOW)
    return [vehicles.map((v) => v.key), bookings.map((b) => b.reference)]
  }

  it('shows the whole fleet when nothing narrows it', () => {
    expect(result({})).toEqual([
      ['v1', 'v2'],
      ['BK-1', 'BK-2'],
    ])
  })

  it('finds a rental by its renter and keeps only the car it is on', () => {
    expect(result({ search: ' dana ' })).toEqual([['v2'], ['BK-2']])
    expect(result({ search: 'bk-1' })).toEqual([['v1'], ['BK-1']])
  })

  it('finds a car by name or plate, booked or not', () => {
    expect(result({ search: 'civic' })).toEqual([['v2'], ['BK-2']])
    const idle = filterCalendar(fleet, [], { ...SHOW_ALL, search: 'bbb-2' }, NOW)
    expect(idle.vehicles).toEqual([CIVIC])
  })

  it('narrows to a branch by where the car is kept', () => {
    expect(result({ location: 'Tampa' })).toEqual([['v2'], ['BK-2']])
  })

  it('hides a status switched off in the legend, but not its car', () => {
    expect(result({ hidden: new Set(['Confirmed']) })).toEqual([['v1', 'v2'], []])
  })

  it('hides a declined request along with the cancelled', () => {
    const declined = booking({
      reference: 'BK-3',
      status: 'Cancelled',
      from: at(20),
      to: at(22),
      declined: { reason: 'other', at: at(12).toISOString(), restorable: true },
    })
    const hidden: CalendarFilters = { ...SHOW_ALL, hidden: new Set(['Cancelled']) }

    expect(filterCalendar(fleet, [declined], hidden, NOW).bookings).toEqual([])
    expect(filterCalendar(fleet, [declined], SHOW_ALL, NOW).bookings).toEqual([declined])
  })
})

describe('bookedVehiclesByDay', () => {
  const year = calendarRange('year', at(16), 0)

  it('counts each car once on every day it is out', () => {
    const trips = [
      booking({ reference: 'BK-1', from: at(16, 9), to: at(18, 9) }),
      // Back to back on the same car: the 18th is still one vehicle, not two.
      booking({ reference: 'BK-2', from: at(18, 9), to: at(18, 17) }),
      booking({ reference: 'BK-3', vehicleId: 'v2', from: at(17, 9), to: at(17, 12) }),
    ]

    expect(Object.fromEntries(bookedVehiclesByDay(trips, year))).toEqual({
      '2026-09-16': 1,
      '2026-09-17': 2,
      '2026-09-18': 1,
    })
  })

  it('does not count the day a rental ends at midnight', () => {
    const counts = bookedVehiclesByDay([booking({ from: at(16), to: at(17) })], year)

    expect([...counts.keys()]).toEqual(['2026-09-16'])
  })

  it('counts an overdue car on its booked days only', () => {
    const late = booking({ status: 'On rental', from: at(10, 9), to: at(12, 12) })

    expect([...bookedVehiclesByDay([late], year).keys()]).toEqual(['2026-09-10', '2026-09-11', '2026-09-12'])
  })

  it('stops at the edge of the year', () => {
    const counts = bookedVehiclesByDay(
      [booking({ from: new Date(2025, 11, 30), to: new Date(2026, 0, 2, 12) })],
      year,
    )

    expect([...counts.keys()]).toEqual(['2026-01-01', '2026-01-02'])
  })
})

describe('heatLevel', () => {
  it('steps up with the share of the fleet that is out', () => {
    expect([0, 1, 3, 5, 6, 8].map((booked) => heatLevel(booked, 8))).toEqual([0, 1, 2, 3, 3, 4])
  })

  it('tops out when rentals on removed cars outnumber the fleet', () => {
    expect(heatLevel(3, 0)).toBe(4)
  })
})

describe('yearMonths', () => {
  it('pads each month to the weekday it starts on', () => {
    const months = yearMonths(new Date(2026, 0, 1), 0)
    // September 2026 starts on a Tuesday: two blanks from Sunday, one from Monday.
    const blanks = (starts: 0 | 1) =>
      yearMonths(new Date(2026, 0, 1), starts)[8].cells.filter((cell) => cell === null).length

    expect(months).toHaveLength(12)
    expect(months[1].cells.filter(Boolean)).toHaveLength(28)
    expect([blanks(0), blanks(1)]).toEqual([2, 1])
  })
})

describe('address bar', () => {
  it('opens the default view for anything it does not know', () => {
    expect(parseCalendarView('week')).toBe('week')
    expect(parseCalendarView('fortnight')).toBe('month')
    expect(parseCalendarView(null)).toBe('month')
  })

  it('falls back on a day that does not exist rather than rolling it over', () => {
    const fallback = at(16)

    expect(parseCalendarDay('2026-09-20', fallback)).toEqual(at(20))
    expect(parseCalendarDay('2026-02-31', fallback)).toBe(fallback)
    expect(parseCalendarDay('next week', fallback)).toBe(fallback)
  })
})
