import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/services/api/client'
import { screeningApi } from './screening.api'
import type { ScreeningWire } from './booking.mapper'

vi.mock('@/services/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)

function wire(overrides: Partial<ScreeningWire> = {}): ScreeningWire {
  return {
    id: 's1',
    customerId: 'cus_1',
    status: 'clear',
    failureReason: null,
    recordsFound: false,
    hasReport: true,
    canReorder: false,
    reused: false,
    completedAt: '2026-09-20T10:00:02Z',
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

describe('screeningApi.get', () => {
  it('reads the booking by reference', async () => {
    get.mockResolvedValue({ data: wire() } as never)

    const screening = await screeningApi.get('BK-10000')

    expect(get).toHaveBeenCalledWith('/bookings/BK-10000/screening')
    expect(screening?.status).toBe('clear')
  })

  it('reports no check rather than a null one', async () => {
    // The endpoint answers 200 with null when none was ordered; the portal shows "not started",
    // which is a different thing from a check that failed.
    get.mockResolvedValue({ data: null } as never)

    expect(await screeningApi.get('BK-10000')).toBeUndefined()
  })
})

describe('screeningApi.order', () => {
  it('posts with no body and maps the result', async () => {
    post.mockResolvedValue({ data: wire() } as never)

    const screening = await screeningApi.order('BK-10000')

    expect(post).toHaveBeenCalledWith('/bookings/BK-10000/screening')
    expect(screening.status).toBe('clear')
  })
})


describe('screeningApi.report', () => {
  it('asks for the PDF as a blob, not as parsed JSON', async () => {
    // Without responseType the browser would try to parse the PDF bytes as JSON and fail.
    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    get.mockResolvedValue({ data: pdf } as never)

    const result = await screeningApi.report('BK-10000')

    expect(get).toHaveBeenCalledWith('/bookings/BK-10000/screening/report', {
      responseType: 'blob',
    })
    expect(result).toBe(pdf)
  })
})

describe('screeningApi.forEmail', () => {
  it('reads by email, the key the API matches a renter on', async () => {
    get.mockResolvedValue({ data: wire({ reused: true }) } as never)

    const screening = await screeningApi.forEmail('m@example.com')

    expect(get).toHaveBeenCalledWith('/customers/screening', { params: { email: 'm@example.com' } })
    expect(screening?.reused).toBe(true)
  })

  it('reports no check when the last one is too old to stand', async () => {
    // The API nulls a stale result rather than returning it, so the form says "no check on
    // file" — which is what ordering would then do anyway.
    get.mockResolvedValue({ data: null } as never)

    expect(await screeningApi.forEmail('m@example.com')).toBeUndefined()
  })
})

describe('screeningApi.orderForCustomer', () => {
  it('sends only what the check needs, not the whole renter', async () => {
    // Sending the rest of the form let a half-typed edit overwrite the saved renter's phone,
    // address and licence number — a check is not an edit, so those never leave the browser.
    post.mockResolvedValue({ data: wire() } as never)

    const screening = await screeningApi.orderForCustomer({
      name: '  Marisol Vega ',
      email: ' marisol.vega@example.com ',
      dateOfBirth: '1991-04-17',
    })

    expect(post).toHaveBeenCalledWith('/customers/screening', {
      name: 'Marisol Vega',
      email: 'marisol.vega@example.com',
      dateOfBirth: '1991-04-17',
    })
    expect(screening.status).toBe('clear')
  })
})

describe('screeningApi.reportForEmail', () => {
  it('asks for the PDF as a blob, not as parsed JSON', async () => {
    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    get.mockResolvedValue({ data: pdf } as never)

    const result = await screeningApi.reportForEmail('m@example.com')

    expect(get).toHaveBeenCalledWith('/customers/screening/report', {
      params: { email: 'm@example.com' },
      responseType: 'blob',
    })
    expect(result).toBe(pdf)
  })
})
