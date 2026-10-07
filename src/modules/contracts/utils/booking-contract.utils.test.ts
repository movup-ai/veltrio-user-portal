import { describe, expect, it } from 'vitest'
import { siteUrl } from '@/modules/vehicles/utils/public-links'
import { ApiError } from '@/types/api'
import { isChoiceUnchecked, shownTemplateId, templateChoice } from './agreement-template.utils'
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

describe('picking a template for a booking', () => {
  const templates = [
    { id: 'std', isDefault: true },
    { id: 'vans', isDefault: false },
  ]

  it('shows the chosen template, or the default when none is chosen or the choice is gone', () => {
    expect(shownTemplateId('vans', templates)).toBe('vans')
    expect(shownTemplateId('', templates)).toBe('std')
    expect(shownTemplateId('deleted', templates)).toBe('std')
  })

  it('sends only a choice that differs from the default, so a default booking follows it', () => {
    expect(templateChoice('vans', templates)).toBe('vans')
    expect(templateChoice('std', templates)).toBeUndefined()
    expect(templateChoice('', templates)).toBeUndefined()
    // A draft can outlive the template it named; the API would refuse the dead id.
    expect(templateChoice('deleted', templates)).toBeUndefined()
  })

  it("holds a draft's choice until the list can check it, rather than send or drop it unseen", () => {
    // Sent unchecked it could pin the booking to today's default; dropped, it changes the terms.
    expect(isChoiceUnchecked('vans', undefined)).toBe(true)
    expect(isChoiceUnchecked('vans', templates)).toBe(false)
    expect(isChoiceUnchecked('', undefined)).toBe(false)
    expect(isChoiceUnchecked(undefined, undefined)).toBe(false)
  })
})
