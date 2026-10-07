import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ConditionPhoto, HandoverInput } from '../types/booking.types'

const calls: string[] = []
const remove = vi.fn<(reference: string, photoId: string) => Promise<void>>()
const upload = vi.fn<(reference: string, stage: string, file: File) => Promise<ConditionPhoto>>()
const pickUp = vi.fn<(reference: string, input: unknown) => Promise<unknown>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('../api/booking-condition-photo.api', () => ({
  conditionPhotoApi: {
    remove: (reference: string, photoId: string) => {
      calls.push(`remove ${photoId}`)
      return remove(reference, photoId)
    },
  },
  uploadConditionPhoto: (reference: string, stage: string, file: File) => {
    calls.push(`upload ${file.name}`)
    return upload(reference, stage, file)
  },
}))
vi.mock('../api/booking.api', () => ({
  bookingApi: {
    pickUp: (reference: string, input: unknown) => {
      calls.push('pickUp')
      return pickUp(reference, input)
    },
  },
}))

const { useBookingHandover } = await import('./use-booking-handover')

const photo = (id: string, stage: ConditionPhoto['stage'] = 'pickup'): ConditionPhoto => ({
  id,
  stage,
  name: `${id}.jpg`,
  url: `https://storage.test/${id}`,
})
const file = (name: string) => new File(['photo'], name, { type: 'image/jpeg' })
const READINGS = { odometer: 12480, fuelLevel: 6, notes: '' } as const

function handOver(input: HandoverInput) {
  const client = new QueryClient()
  const { result } = renderHook(() => useBookingHandover('BK-10001', 'pickUp'), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  })
  result.current.mutate(input)
  return result
}

describe('useBookingHandover', () => {
  beforeEach(() => {
    calls.length = 0
    for (const mock of [remove, upload, pickUp]) mock.mockReset()
    remove.mockResolvedValue()
    upload.mockImplementation((_, stage, sent) => Promise.resolve(photo(sent.name, stage as 'pickup')))
    pickUp.mockResolvedValue({})
  })

  it('sends the photos, then records the handover naming the ones it sent', async () => {
    const result = handOver({ ...READINGS, photos: [file('front'), file('rear')] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(calls).toEqual(['upload front', 'upload rear', 'pickUp'])
    expect(upload).toHaveBeenCalledWith('BK-10001', 'pickup', expect.any(File))
    // By id: the API keeps these and discards any other photo left on the stage.
    expect(pickUp).toHaveBeenCalledWith('BK-10001', { ...READINGS, photoIds: ['front', 'rear'] })
    // Never the portal's job: another tab's photos must not be deleted from under it.
    expect(remove).not.toHaveBeenCalled()
  })

  it('takes the photos back when the handover is refused', async () => {
    pickUp.mockRejectedValue(new Error('not_fully_paid'))

    const result = handOver({ ...READINGS, photos: [file('front'), file('rear')] })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(calls.slice(-2).sort()).toEqual(['remove front', 'remove rear'])
  })

  it('re-reads the booking after a failure, since the handover may have been recorded all the same', async () => {
    const invalidate = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    pickUp.mockRejectedValue(new Error('Network Error'))

    const result = handOver({ ...READINGS, photos: [] })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['booking-payments', 'BK-10001'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['booking-condition-photos', 'BK-10001'] })
    invalidate.mockRestore()
  })

  it('takes back on the next try what it could not take back before', async () => {
    // The handover is refused and so is the request to take its photo back. Left there, the
    // photo would hold one of the stage's slots against the retry's own copy.
    pickUp.mockRejectedValueOnce(new Error('not_fully_paid'))
    remove.mockRejectedValueOnce(new Error('Network Error'))
    const result = handOver({ ...READINGS, photos: [file('front')] })
    await waitFor(() => expect(result.current.isError).toBe(true))
    calls.length = 0

    result.current.mutate({ ...READINGS, photos: [file('front-again')] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Its own leftover, by id, before the new copy goes up: never the whole stage.
    expect(calls).toEqual(['remove front', 'upload front-again', 'pickUp'])
    expect(pickUp).toHaveBeenLastCalledWith('BK-10001', { ...READINGS, photoIds: ['front-again'] })
  })

  it('forgets a leftover once it has been taken back', async () => {
    pickUp.mockRejectedValueOnce(new Error('not_fully_paid'))
    remove.mockRejectedValueOnce(new Error('Network Error'))
    const result = handOver({ ...READINGS, photos: [file('front')] })
    await waitFor(() => expect(result.current.isError).toBe(true))
    pickUp.mockRejectedValueOnce(new Error('not_fully_paid'))
    result.current.mutate({ ...READINGS, photos: [] })
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.isError).toBe(true))
    calls.length = 0

    result.current.mutate({ ...READINGS, photos: [] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(calls).toEqual(['pickUp'])
  })

  it('does not hand over with a photo missing, and takes back the ones that did arrive', async () => {
    upload.mockImplementation((_, stage, sent) =>
      sent.name === 'rear'
        ? Promise.reject(new Error('Upload failed'))
        : Promise.resolve(photo(sent.name, stage as 'pickup')),
    )

    const result = handOver({ ...READINGS, photos: [file('front'), file('rear')] })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(pickUp).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledWith('BK-10001', 'front')
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('takes back a photo that arrived after an earlier one failed', async () => {
    // Order matters: stopping at the first failure left the later, successful ones stored.
    upload.mockImplementation((_, stage, sent) =>
      sent.name === 'front'
        ? Promise.reject(new Error('Upload failed'))
        : Promise.resolve(photo(sent.name, stage as 'pickup')),
    )

    const result = handOver({ ...READINGS, photos: [file('front'), file('rear')] })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(remove).toHaveBeenCalledWith('BK-10001', 'rear')
  })
})
