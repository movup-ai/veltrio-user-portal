import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/services/api/client'
import { bookingContractApi } from './booking-contract.api'

vi.mock('@/services/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

beforeEach(() => vi.resetAllMocks())

describe('bookingContractApi.public', () => {
  it("reads the agreement from the company's own address, by subdomain rather than tenant id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { companySignature: null } } as never)

    await bookingContractApi.public('sunstate', { contractId: 'c1', token: 'tok' })

    expect(apiClient.get).toHaveBeenCalledWith('/marketplace/companies/sunstate/contracts/c1/tok')
  })
})
