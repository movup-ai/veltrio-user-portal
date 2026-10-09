import { describe, expect, it } from 'vitest'
import { siteUrl } from '@/modules/vehicles/utils/public-links'
import { ApiError } from '@/types/api'
import { draftTemplateId, lostDraftTerms } from './agreement-template.utils'
import {
  agreementIssued,
  contractFileName,
  contractLinkUrl,
  drawingProblem,
  signatureProblems,
} from './booking-contract.utils'

describe('contract links and files', () => {
  it("builds the renter's page on the company's own site, with no tenant id in the path", () => {
    const link = { contractId: 'c1', token: 'tok' }
    expect(contractLinkUrl('sunstate', link)).toBe(`${siteUrl('sunstate')}/sign/c1/tok`)
    expect(siteUrl('sunstate')).toMatch(/^https:\/\/sunstate\./)
  })

  it('names the file as the API numbers the agreement', () => {
    expect(contractFileName('BK-10001')).toBe('AGR-BK-10001.pdf')
  })

  it('has a document to open only once an agreement is issued', () => {
    expect(agreementIssued({ status: 'issued' })).toBe(true)
    expect(agreementIssued({ status: 'signed' })).toBe(true)
    // Before that there is only a preview, and nothing at all while the card is loading.
    expect(agreementIssued({ status: 'none' })).toBe(false)
    expect(agreementIssued(undefined)).toBe(false)
  })
})

describe('signatureProblems', () => {
  const complete = { name: 'Marisol Vega', consent: true, typed: false, drawing: 'data:image/png;base64,AA' }

  it('passes a name, a drawing and consent', () => {
    expect(signatureProblems(complete)).toEqual({})
  })

  it('names each thing still missing under its own field', () => {
    expect(signatureProblems({ name: '  ', consent: false, typed: false })).toEqual({
      name: 'nameRequired',
      signature: 'signatureRequired',
      consent: 'consentRequired',
    })
  })

  it('takes the typed name in place of a drawing when the renter chooses that', () => {
    expect(signatureProblems({ ...complete, typed: true, drawing: undefined })).toEqual({})
  })
})

describe('drawingProblem', () => {
  const refusal = (code: string) => new ApiError('validation', 'no', { status: 422, code })

  it("reads the API's two refusals of a drawing, and nothing else", () => {
    expect(drawingProblem(refusal('signature_blank'))).toBe('signatureRequired')
    expect(drawingProblem(refusal('signature_invalid'))).toBe('signatureUnreadable')
    expect(drawingProblem(refusal('already_signed'))).toBeUndefined()
  })
})

describe('the terms an older draft was saved with', () => {
  const templates = [
    { id: 'std', name: 'Standard rental agreement', isDefault: true },
    { id: 'vans', name: 'Vans', isDefault: false },
  ]

  it('reads the choice off a draft saved when the booking form still picked the terms', () => {
    expect(draftTemplateId({ agreementTemplateId: 'vans' })).toBe('vans')
    expect(draftTemplateId({ agreementTemplateId: '' })).toBeUndefined()
    expect(draftTemplateId({ agreementTemplateId: 7 })).toBeUndefined()
    expect(draftTemplateId({})).toBeUndefined()
  })

  it('names the terms the booking will no longer start on', () => {
    expect(lostDraftTerms('vans', templates)).toEqual({ name: 'Vans' })
  })

  it('loses nothing when the draft named the default, or a template deleted since', () => {
    // Either way the booking was going to be made on the default, as it is now.
    expect(lostDraftTerms('std', templates)).toBeUndefined()
    expect(lostDraftTerms('deleted', templates)).toBeUndefined()
    expect(lostDraftTerms(undefined, templates)).toBeUndefined()
  })

  it('still warns, unnamed, while the templates cannot say which it was', () => {
    // Silence here could hide a real change of terms behind a list that failed to load.
    expect(lostDraftTerms('vans', undefined)).toEqual({})
    expect(lostDraftTerms(undefined, undefined)).toBeUndefined()
  })
})
