import { fromDateValue, type DateRange } from '@/components/ui/date-range-picker'

/** "Sep 10 – Sep 20", the single day when both ends match, or `any` for an empty range. */
export function dateRangeLabel(range: DateRange, formatDay: (date: Date) => string, any: string): string {
  const days = [fromDateValue(range.from), fromDateValue(range.to)].filter((d) => d != null).map(formatDay)
  if (days.length === 0) return any
  return days[0] === days[1] ? days[0] : days.join(' – ')
}
