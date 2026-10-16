import { describe, expect, it } from 'vitest'
import {
  bookingTrends,
  compare,
  dayPart,
  daySummary,
  firstName,
  isFlat,
  monthRevenue,
  percentChange,
  recentRevenue,
  revenueWindow,
  roundedPercent,
  runningTotals,
  sparkPoints,
  trendWindow,
} from './dashboard.utils'

describe('revenueWindow', () => {
  it('reads from the first of last month, across a year end too', () => {
    expect(revenueWindow('2026-10-16')).toEqual({ from: '2026-09-01', to: '2026-10-16' })
    expect(revenueWindow('2027-01-05')).toEqual({ from: '2026-12-01', to: '2027-01-05' })
  })
})

describe('monthRevenue', () => {
  const collected = [
    { day: '2026-09-02', collected: 100 },
    { day: '2026-09-16', collected: 40 },
    { day: '2026-09-17', collected: 900 },
    { day: '2026-10-01', collected: 25 },
    { day: '2026-10-16', collected: 75 },
  ]

  it('runs from the 1st to today, a day with nothing taken as 0 and none after today', () => {
    const month = monthRevenue(collected, '2026-10-16')

    expect(month.days).toHaveLength(16)
    expect(month.days[0]).toEqual({ day: '2026-10-01', collected: 25 })
    expect(month.days[1]).toEqual({ day: '2026-10-02', collected: 0 })
    expect(month.days.at(-1)).toEqual({ day: '2026-10-16', collected: 75 })
    expect(month.total).toBe(100)
  })

  it('compares with last month up to the same day, not the whole of it', () => {
    expect(monthRevenue(collected, '2026-10-16').lastMonthToDate).toBe(140)
    // September has no 31st: the comparison runs to its last day.
    expect(monthRevenue(collected, '2026-10-31').lastMonthToDate).toBe(1040)
  })
})

describe('KPI trends', () => {
  it('draws the month so far as a running total, rising from the bottom left', () => {
    const days = [
      { day: '2026-10-01', collected: 0 },
      { day: '2026-10-02', collected: 30 },
      { day: '2026-10-03', collected: 10 },
    ]
    expect(runningTotals(days)).toEqual([0, 30, 40])
    expect(sparkPoints([0, 30, 40], 72, 28)).toBe('0,26 36,8 72,2')
    // A flat or single-point series is a level line, not a division by zero.
    expect(sparkPoints([5], 72, 28)).toBe('0,26 72,26')
    expect([isFlat([0, 0, 0]), isFlat([0, 0, 1])]).toEqual([true, false])
  })

  it('compares with last month only when last month had something to compare with', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
    expect(percentChange(50, 0)).toBeUndefined()
  })
})

describe('recentRevenue', () => {
  it('takes the last 14 days to today, a day with nothing as 0, and totals the 14 before', () => {
    const collected = [
      { day: '2026-09-18', collected: 999 },
      { day: '2026-09-19', collected: 40 },
      { day: '2026-10-02', collected: 60 },
      { day: '2026-10-03', collected: 25 },
      { day: '2026-10-16', collected: 75 },
    ]
    const recent = recentRevenue(collected, '2026-10-16')

    expect(recent.days).toHaveLength(14)
    expect(recent.days[0]).toEqual({ day: '2026-10-03', collected: 25 })
    expect(recent.days[1]).toEqual({ day: '2026-10-04', collected: 0 })
    expect(recent.days.at(-1)).toEqual({ day: '2026-10-16', collected: 75 })
    expect(recent.total).toBe(100)
    // Sep 19 to Oct 2: the 18th is outside both fortnights.
    expect(recent.previousTotal).toBe(100)
  })
})

describe('booking trends', () => {
  it('reads four weeks to today, across a month end', () => {
    expect(trendWindow('2026-10-16')).toEqual({ from: '2026-09-19', to: '2026-10-16' })
  })

  it('compares the last 7 days with the 7 before, and draws the last 14', () => {
    // 21 days, earliest first; day i made i bookings, had i % 3 cars out and was i% used.
    const days = Array.from({ length: 21 }, (_, i) => ({
      day: `2026-10-${String(i + 1).padStart(2, '0')}`,
      created: i,
      onRent: i % 3,
      utilization: i / 100,
    }))
    const trends = bookingTrends(days)

    expect(trends.bookings.current).toBe(14 + 15 + 16 + 17 + 18 + 19 + 20)
    expect(trends.bookings.previous).toBe(7 + 8 + 9 + 10 + 11 + 12 + 13)
    expect(trends.bookings.spark).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    expect(trends.activeRentals.current).toBe(20 % 3)
    expect(trends.utilization.current).toBeCloseTo(0.17)
    expect(trends.utilization.previous).toBeCloseTo(0.1)
  })

  it("weighs today's utilization by the part of the day gone by, as fleet time does", () => {
    const util = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.8]
    const days = util.map((utilization, i) => ({
      day: `2026-10-${10 + i}`,
      created: 0,
      onRent: 0,
      utilization,
    }))

    // Noon: today is half a day, so its 80% counts half as much as a whole day's.
    expect(bookingTrends(days, 0.5).utilization.current).toBeCloseTo((6 * 0.2 + 0.5 * 0.8) / 6.5)
    expect(bookingTrends(days, 0.5).utilization.previous).toBeCloseTo(0.1)
  })

  it('rounds a change to one decimal, or to a whole number once it is in the hundreds', () => {
    expect([roundedPercent(9.84), roundedPercent(-12.35), roundedPercent(1094.44)]).toEqual([
      9.8, -12.3, 1094,
    ])
  })

  it('names the direction of a change, with a percentage only when there was something before', () => {
    expect(compare(12, 10)).toEqual({ tone: 'up', difference: 2, percent: 20 })
    expect(compare(8, 10)).toEqual({ tone: 'down', difference: -2, percent: -20 })
    expect(compare(3, 0)).toEqual({ tone: 'up', difference: 3, percent: undefined })
    expect(compare(0, 0)).toEqual({ tone: 'neutral', difference: 0, percent: undefined })
  })
})

describe('header', () => {
  it('names the part of the day, the first name and what is left today', () => {
    expect([dayPart(0), dayPart(11), dayPart(12), dayPart(17), dayPart(18)]).toEqual([
      'morning',
      'morning',
      'afternoon',
      'afternoon',
      'evening',
    ])
    expect(firstName('  Edward  Thomas ')).toBe('Edward')
    expect([daySummary(0, 0), daySummary(2, 0), daySummary(0, 1), daySummary(2, 1)]).toEqual([
      'none',
      'pickupsOnly',
      'returnsOnly',
      'both',
    ])
  })
})
