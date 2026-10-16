import type { BookingDay } from '@/modules/bookings/types/booking.types'
import type { CollectedDay } from '@/modules/payments/types/payment.types'

function parts(day: string): [year: number, month: number, date: number] {
  const [year, month, date] = day.split('-').map(Number)
  return [year, month, date]
}

function isoDay(year: number, month: number, date: number): string {
  return new Date(Date.UTC(year, month - 1, date)).toISOString().slice(0, 10)
}

const sum = (values: number[]) => values.reduce((total, v) => total + v, 0)
const mean = (values: number[]) => (values.length ? sum(values) / values.length : 0)

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** From the first of last month to today, so last month's same days come in the same read. */
export function revenueWindow(today: string): { from: string; to: string } {
  const [year, month] = parts(today)
  return { from: isoDay(year, month - 1, 1), to: today }
}

export interface MonthRevenue {
  /** This month from the 1st to today; the days still to come have no figure to draw. */
  days: CollectedDay[]
  total: number
  /** Last month up to the same day of the month: the 31st falls back to a shorter month's end. */
  lastMonthToDate: number
}

export function monthRevenue(collected: CollectedDay[], today: string): MonthRevenue {
  const [year, month, date] = parts(today)
  const byDay = new Map(collected.map((c) => [c.day, c.collected]))
  const days = Array.from({ length: date }, (_, i) => {
    const day = isoDay(year, month, i + 1)
    return { day, collected: byDay.get(day) ?? 0 }
  })
  const lastMonthEnd = isoDay(year, month - 1, Math.min(date, daysInMonth(year, month - 1)))
  const lastMonthStart = isoDay(year, month - 1, 1)
  const lastMonthToDate = sum(
    collected.filter((c) => c.day >= lastMonthStart && c.day <= lastMonthEnd).map((c) => c.collected),
  )
  return { days, total: sum(days.map((d) => d.collected)), lastMonthToDate }
}

export interface RecentRevenue {
  /** The last `count` days, earliest first, ending today. */
  days: CollectedDay[]
  total: number
  /** The `count` days before them, for the comparison. */
  previousTotal: number
}

export function recentRevenue(collected: CollectedDay[], today: string, count = 14): RecentRevenue {
  const [year, month, date] = parts(today)
  const byDay = new Map(collected.map((c) => [c.day, c.collected]))
  const span = (from: number) =>
    Array.from({ length: count }, (_, i) => {
      const day = isoDay(year, month, date - from + i)
      return { day, collected: byDay.get(day) ?? 0 }
    })
  const days = span(count - 1)
  return {
    days,
    total: sum(days.map((d) => d.collected)),
    previousTotal: sum(span(2 * count - 1).map((d) => d.collected)),
  }
}

/** Four weeks to today: this week against the last, with two weeks of sparkline either way. */
export function trendWindow(today: string): { from: string; to: string } {
  const [year, month, date] = parts(today)
  return { from: isoDay(year, month, date - 27), to: today }
}

export interface Comparison {
  tone: 'up' | 'down' | 'neutral'
  difference: number
  /** Undefined when the earlier period was zero, which no percentage can describe. */
  percent?: number
}

/** One decimal, until the decimal is noise: "+1,094%", not "+1,094.4%". */
export function roundedPercent(percent: number): number {
  return Math.abs(percent) >= 100 ? Math.round(percent) : Math.round(percent * 10) / 10
}

export function compare(current: number, previous: number): Comparison {
  const difference = current - previous
  return {
    tone: difference > 0 ? 'up' : difference < 0 ? 'down' : 'neutral',
    difference,
    percent: percentChange(current, previous),
  }
}

export interface BookingTrends {
  /** Made in the last 7 days, the 7 before, and each of the last 14. */
  bookings: { current: number; previous: number; spark: number[] }
  /** Out now, and at the end of each of the last 14 days. */
  activeRentals: { current: number; spark: number[] }
  /** 0-1 shares: the last 7 days, the 7 before, and each of the last 14. */
  utilization: { current: number; previous: number; spark: number[] }
}

/**
 * `days` earliest first, ending today. Today's utilization is of the day so far, so it counts
 * for `todayFraction` of a day: the week's figure is then the fleet's time on rent, exactly.
 */
export function bookingTrends(days: BookingDay[], todayFraction = 1): BookingTrends {
  const week = days.slice(-7)
  const lastWeek = days.slice(-14, -7)
  const fortnight = days.slice(-14)
  const weights = week.map((_, i) => (i === week.length - 1 ? todayFraction : 1))
  const weekUse = sum(week.map((d, i) => d.utilization * weights[i])) / (sum(weights) || 1)
  return {
    bookings: {
      current: sum(week.map((d) => d.created)),
      previous: sum(lastWeek.map((d) => d.created)),
      spark: fortnight.map((d) => d.created),
    },
    activeRentals: { current: days.at(-1)?.onRent ?? 0, spark: fortnight.map((d) => d.onRent) },
    utilization: {
      current: weekUse,
      previous: mean(lastWeek.map((d) => d.utilization)),
      spark: fortnight.map((d) => d.utilization),
    },
  }
}

/** The running total after each day, which a sparkline of the month so far draws. */
export function runningTotals(days: CollectedDay[]): number[] {
  let total = 0
  return days.map((d) => (total += d.collected))
}

/** Percentage change, or undefined when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | undefined {
  return previous > 0 ? ((current - previous) / previous) * 100 : undefined
}

export function isFlat(values: number[]): boolean {
  return values.every((v) => v === values[0])
}

/** SVG polyline points for a sparkline, the lowest value at the bottom and the highest at the top. */
export function sparkPoints(values: number[], width = 72, height = 28): string {
  if (values.length === 0) return ''
  const series = values.length === 1 ? [values[0], values[0]] : values
  const min = Math.min(...series)
  const range = Math.max(...series) - min || 1
  const pad = 2
  return series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * width
      const y = height - pad - ((v - min) / range) * (height - pad * 2)
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`
    })
    .join(' ')
}

export type DayPart = 'morning' | 'afternoon' | 'evening'

export function dayPart(hour: number): DayPart {
  if (hour < 12) return 'morning'
  return hour < 18 ? 'afternoon' : 'evening'
}

export type DaySummary = 'none' | 'pickupsOnly' | 'returnsOnly' | 'both'

/** Which sentence the header uses for what is still to happen today. */
export function daySummary(pickups: number, returns: number): DaySummary {
  if (pickups > 0 && returns > 0) return 'both'
  if (pickups > 0) return 'pickupsOnly'
  return returns > 0 ? 'returnsOnly' : 'none'
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? ''
}
