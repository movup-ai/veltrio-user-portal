import { describe, expect, it } from 'vitest'
import { statusColors } from '@/components/data-display/status-colors'
import { BOOKING_STATUS_FILTERS } from '../types/booking.types'

// Every badge the bookings list can show: the statuses, a declined request, and "Ready".
const SHOWN = [...BOOKING_STATUS_FILTERS, 'Ready']

describe('booking status colours', () => {
  it('gives every status the list can show a look of its own', () => {
    const looks = SHOWN.map((status) => {
      const { bg, fg } = statusColors(status)
      return `${bg} / ${fg}`
    })

    expect(new Set(looks).size).toBe(SHOWN.length)
  })

  it('has colours for each of them, rather than the grey an unknown status falls back to', () => {
    const fallback = statusColors('no such status')

    for (const status of SHOWN.filter((shown) => shown !== 'Cancelled')) {
      expect(statusColors(status), status).not.toEqual(fallback)
    }
  })
})
