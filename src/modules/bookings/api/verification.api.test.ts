import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/services/api/client'
import { verificationApi } from './verification.api'
import type { VerificationWire } from './booking.mapper'

vi.mock('@/services/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)

function wire(overrides: Partial<VerificationWire> = {}): VerificationWire {
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

describe('verificationApi.get', () => {
  it('reads the booking by reference', async () => {
    get.mockResolvedValue({ data: wire() } as never)

    const verification = await verificationApi.get('BK-10000')

    expect(get).toHaveBeenCalledWith('/bookings/BK-10000/verification', {
      params: { kind: 'background' },
    })
    expect(verification?.status).toBe('clear')
  })

  it('reports no check rather than a null one', async () => {
    // The endpoint answers 200 with null when none was ordered; the portal shows "not started",
    // which is a different thing from a check that failed.
    get.mockResolvedValue({ data: null } as never)

    expect(await verificationApi.get('BK-10000')).toBeUndefined()
  })
})

describe('verificationApi.order', () => {
  it('posts with no body and maps the result', async () => {
    post.mockResolvedValue({ data: wire() } as never)

    const verification = await verificationApi.order('BK-10000')

    expect(post).toHaveBeenCalledWith('/bookings/BK-10000/verification')
    expect(verification.status).toBe('clear')
  })
})


describe('verificationApi.report', () => {
  it('asks for the PDF as a blob, not as parsed JSON', async () => {
    // Without responseType the browser would try to parse the PDF bytes as JSON and fail.
    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    get.mockResolvedValue({ data: pdf } as never)

    const result = await verificationApi.report('BK-10000')

    expect(get).toHaveBeenCalledWith('/bookings/BK-10000/verification/report', {
      responseType: 'blob',
    })
    expect(result).toBe(pdf)
  })
})

describe('verificationApi.forEmail', () => {
  it('reads by email, the key the API matches a renter on', async () => {
    get.mockResolvedValue({ data: wire({ reused: true }) } as never)

    const verification = await verificationApi.forEmail('m@example.com')

    expect(get).toHaveBeenCalledWith('/customers/verification', {
      params: { email: 'm@example.com', kind: 'background' },
    })
    expect(verification?.reused).toBe(true)
  })

  it('asks for the kind it shows, so the insurance card never reads a criminal check', async () => {
    get.mockResolvedValue({ data: null } as never)

    await verificationApi.forEmail('m@example.com', 'insurance')

    expect(get).toHaveBeenCalledWith('/customers/verification', {
      params: { email: 'm@example.com', kind: 'insurance' },
    })
  })

  it('reports no check when the last one is too old to stand', async () => {
    // The API nulls a stale result rather than returning it, so the form says "no check on
    // file" — which is what ordering would then do anyway.
    get.mockResolvedValue({ data: null } as never)

    expect(await verificationApi.forEmail('m@example.com')).toBeUndefined()
  })
})

describe('verificationApi.orderForCustomer', () => {
  it('sends only what the check needs, not the whole renter', async () => {
    // Sending the rest of the form let a half-typed edit overwrite the saved renter's phone,
    // address and licence number — a check is not an edit, so those never leave the browser.
    post.mockResolvedValue({ data: wire() } as never)

    const verification = await verificationApi.orderForCustomer({
      name: '  Marisol Vega ',
      email: ' marisol.vega@example.com ',
      dateOfBirth: '1991-04-17',
    })

    expect(post).toHaveBeenCalledWith('/customers/verification', {
      name: 'Marisol Vega',
      email: 'marisol.vega@example.com',
      dateOfBirth: '1991-04-17',
    })
    expect(verification.status).toBe('clear')
  })
})

describe('verificationApi.reportForEmail', () => {
  it('asks for the PDF as a blob, not as parsed JSON', async () => {
    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    get.mockResolvedValue({ data: pdf } as never)

    const result = await verificationApi.reportForEmail('m@example.com')

    expect(get).toHaveBeenCalledWith('/customers/verification/report', {
      params: { email: 'm@example.com' },
      responseType: 'blob',
    })
    expect(result).toBe(pdf)
  })
})
