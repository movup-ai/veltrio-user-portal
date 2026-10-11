import { afterEach, describe, expect, it, vi } from 'vitest'
import { customerDocumentApi, uploadCustomerDocuments } from './customer-document.api'
import type { CustomerDocument, DocumentKind } from '../types/customer.types'

vi.mock('@/services/api/client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))

const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' })

function document(kind: DocumentKind): CustomerDocument {
  return {
    id: `doc-${kind}`,
    kind,
    status: 'uploading',
    name: `${kind}.jpg`,
    contentType: 'image/jpeg',
    sizeBytes: 1,
    createdAt: '2026-10-11T00:00:00Z',
  }
}

describe('uploadCustomerDocuments', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sends each picked scan and reports the one that failed without throwing', async () => {
    const requested: DocumentKind[] = []
    vi.spyOn(customerDocumentApi, 'requestUpload').mockImplementation(async (_, kind) => {
      requested.push(kind)
      // The customer is already saved by now, so a refused scan must not undo that.
      if (kind === 'insurance') throw new Error('storage refused it')
      return {
        document: document(kind),
        upload: { url: 'https://storage.test', fields: {}, expiresAt: '2026-10-11T00:05:00Z' },
      }
    })
    vi.spyOn(customerDocumentApi, 'uploadToStorage').mockResolvedValue(undefined)
    const completed = vi
      .spyOn(customerDocumentApi, 'completeUpload')
      .mockImplementation(async () => ({ ...document('licence'), status: 'ready' }))

    const failed = await uploadCustomerDocuments('c1', {
      licence: file('licence.jpg'),
      insurance: file('insurance.jpg'),
    })

    expect(requested).toEqual(['licence', 'insurance'])
    expect(completed).toHaveBeenCalledWith('c1', 'doc-licence')
    expect(failed).toEqual(['insurance'])
  })

  it('does nothing when no scan was picked', async () => {
    const requestUpload = vi.spyOn(customerDocumentApi, 'requestUpload')

    expect(await uploadCustomerDocuments('c1', {})).toEqual([])
    expect(requestUpload).not.toHaveBeenCalled()
  })
})
