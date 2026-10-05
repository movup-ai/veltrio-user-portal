import { describe, expect, it } from 'vitest'
import {
  toAgreementTemplate,
  toAgreementTemplatePayload,
  toBookingContract,
  toCompanySignatory,
  toCompanySignatoryPayload,
  toPublicContract,
  toSignaturePayload,
  type AgreementTemplateWire,
  type BookingContractWire,
} from './contract.mapper'

const WIRE: AgreementTemplateWire = {
  id: 'tpl_1',
  name: 'Standard rental agreement',
  revision: 3,
  isDefault: true,
  createdAt: '2026-10-01T09:00:00Z',
  updatedAt: '2026-10-05T09:00:00Z',
  body: '# Fuel\n\nReturn it full.',
}

describe('agreement template mapper', () => {
  it('reads a template with its text', () => {
    expect(toAgreementTemplate(WIRE)).toEqual({
      id: 'tpl_1',
      name: 'Standard rental agreement',
      revision: 3,
      isDefault: true,
      updatedAt: '2026-10-05T09:00:00Z',
      body: '# Fuel\n\nReturn it full.',
    })
  })

  it('trims the name and the ends of the text, but not the blank lines between paragraphs', () => {
    expect(toAgreementTemplatePayload({ name: '  Vans ', body: '\n# Fuel\n\nReturn it full.\n\n' })).toEqual({
      name: 'Vans',
      body: '# Fuel\n\nReturn it full.',
    })
  })
})

const ALLOWED = { allowed: true, reason: null }
const NONE: BookingContractWire = {
  status: 'none',
  number: null,
  template: { id: null, name: 'Vans', revision: 2 },
  signedAt: null,
  signerName: null,
  method: null,
  companySigner: null,
  link: null,
  actions: {
    sign: { allowed: false, reason: 'booking_cancelled' },
    void: { allowed: false, reason: 'a_reason_added_later' },
    changeTemplate: ALLOWED,
  },
}

describe('booking contract mapper', () => {
  it('reads what the API leaves empty as absent, down to a deleted template', () => {
    const contract = toBookingContract(NONE)

    expect(contract).toEqual({
      status: 'none',
      template: { name: 'Vans', revision: 2 },
      actions: {
        sign: { allowed: false, reason: 'booking_cancelled' },
        // A reason this portal has no words for: still off, just unexplained.
        void: { allowed: false, reason: undefined },
        changeTemplate: { allowed: true, reason: undefined },
      },
    })
  })

  it('sends a typed-name signature as an explicit null, with the consent the API insists on', () => {
    expect(toSignaturePayload({ signerName: ' Marisol Vega ' })).toEqual({
      signerName: 'Marisol Vega',
      signature: null,
      consent: true,
    })
  })
})

describe('company signature mapper', () => {
  it('reads an unset signatory as empty, and sends a typed-name one with an explicit null', () => {
    expect(toCompanySignatory({ name: null, title: null, signature: null, updatedAt: null })).toEqual({})
    expect(toCompanySignatoryPayload({ name: ' Edward Thomas ', title: ' Owner ' })).toEqual({
      name: 'Edward Thomas',
      title: 'Owner',
      signature: null,
    })
  })

  it('reads an agreement issued before companies signed as having no company signature', () => {
    const wire = {
      companyName: 'Sunstate',
      reference: 'BK-1',
      number: 'AGR-BK-1',
      renterName: 'Marisol Vega',
      status: 'open' as const,
      sections: [],
      charges: [],
      totals: [],
      terms: [],
      companySignature: null,
      signedAt: null,
      signerName: null,
    }
    const typed = { company: 'Sunstate', name: 'Sam Staff', title: '', signature: null, signed: 'Oct 5, 2026', issuedBy: 'Sam Staff' }

    expect(toPublicContract(wire).companySignature).toBeUndefined()
    expect(toPublicContract({ ...wire, companySignature: typed }).companySignature).toEqual({
      ...typed,
      signature: undefined,
    })
  })
})
