import { describe, expect, it, vi, beforeEach } from 'vitest'
import { serviceRecordApi } from './service-record.api'
import { apiClient } from '@/services/api/client'

vi.mock('@/services/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const wire = {
  id: 'r1',
  vehicleId: 'v1',
  serviceType: 'oil_change',
  performedOn: '2026-03-12',
  odometer: 48200,
  costCents: 8900,
  vendor: "Joe's Auto",
  notes: 'Synthetic',
}

beforeEach(() => vi.resetAllMocks())

describe('serviceRecordApi', () => {
  it('maps cents to dollars and slugs to portal values', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [wire], summary: { recordCount: 1, totalCostCents: 8900, lastServiceOn: '2026-03-12' } },
    } as never)

    const history = await serviceRecordApi.list('v1')

    expect(history.items[0]).toEqual({
      id: 'r1',
      vehicleId: 'v1',
      serviceType: 'Oil change',
      performedOn: '2026-03-12',
      odometer: 48200,
      cost: 89,
      vendor: "Joe's Auto",
      notes: 'Synthetic',
    })
    expect(history.summary).toEqual({ recordCount: 1, totalCost: 89, lastServiceOn: '2026-03-12' })
  })

  it('maps nulls to undefined rather than leaking them into the UI', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [{ ...wire, odometer: null, costCents: null, vendor: null, notes: null }],
        summary: { recordCount: 1, totalCostCents: 0, lastServiceOn: null },
      },
    } as never)

    const history = await serviceRecordApi.list('v1')

    expect(history.items[0].odometer).toBeUndefined()
    expect(history.items[0].cost).toBeUndefined()
    expect(history.summary.lastServiceOn).toBeUndefined()
  })

  it('falls back to Other for a slug the portal does not know', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [{ ...wire, serviceType: 'teleportation' }], summary: { recordCount: 1, totalCostCents: 0, lastServiceOn: null } },
    } as never)

    expect((await serviceRecordApi.list('v1')).items[0].serviceType).toBe('Other')
  })

  it('sends dollars back as integer cents', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: wire } as never)

    await serviceRecordApi.create('v1', {
      serviceType: 'Brake service',
      performedOn: '2026-03-12',
      cost: 340.55,
      vendor: '  Downtown Tire  ',
    })

    expect(apiClient.post).toHaveBeenCalledWith('/vehicles/v1/service-records', {
      serviceType: 'brake_service',
      performedOn: '2026-03-12',
      odometer: null,
      costCents: 34055,
      vendor: 'Downtown Tire',
      notes: null,
      nextDueOn: null,
      nextDueOdometer: null,
    })
  })

  it('does not round a fractional cent into a wrong integer', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: wire } as never)

    await serviceRecordApi.create('v1', { serviceType: 'Repair', performedOn: '2026-03-12', cost: 0.1 + 0.2 })

    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toMatchObject({ costCents: 30 })
  })
})

describe('service intervals', () => {
  it('maps the due block, decoding its slug and dropping nulls', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [{ ...wire, nextDueOn: '2026-09-12', nextDueOdometer: 53200 }],
        summary: { recordCount: 1, totalCostCents: 8900, lastServiceOn: '2026-03-12' },
        due: {
          recordId: 'r1',
          serviceType: 'oil_change',
          state: 'due_soon',
          nextDueOn: null,
          nextDueOdometer: 35000,
          daysRemaining: null,
          milesRemaining: 188,
        },
      },
    } as never)

    const history = await serviceRecordApi.list('v1')

    expect(history.items[0].nextDueOn).toBe('2026-09-12')
    expect(history.items[0].nextDueOdometer).toBe(53200)
    expect(history.due).toEqual({
      recordId: 'r1',
      serviceType: 'Oil change',
      state: 'due_soon',
      nextDueOn: undefined,
      nextDueOdometer: 35000,
      daysRemaining: undefined,
      milesRemaining: 188,
    })
  })

  it('leaves due undefined when nothing is scheduled', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [wire],
        summary: { recordCount: 1, totalCostCents: 8900, lastServiceOn: '2026-03-12' },
        due: null,
      },
    } as never)

    expect((await serviceRecordApi.list('v1')).due).toBeUndefined()
  })

  it('keeps a negative miles-remaining so overdue reads as overdue', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [wire],
        summary: { recordCount: 1, totalCostCents: 0, lastServiceOn: null },
        due: {
          recordId: 'r1', serviceType: 'oil_change', state: 'overdue',
          nextDueOn: null, nextDueOdometer: 35000, daysRemaining: null, milesRemaining: -1000,
        },
      },
    } as never)

    const due = (await serviceRecordApi.list('v1')).due
    expect(due?.state).toBe('overdue')
    expect(due?.milesRemaining).toBe(-1000)
  })

  it('sends the due fields, omitting ones left blank', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: wire } as never)

    await serviceRecordApi.create('v1', {
      serviceType: 'Oil change',
      performedOn: '2026-03-12',
      nextDueOdometer: 53200,
    })

    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toMatchObject({
      nextDueOn: null,
      nextDueOdometer: 53200,
    })
  })
})
