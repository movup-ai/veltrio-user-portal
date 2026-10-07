import type { ContractRefusal } from '../constants/booking-contract.constants'
import type { CompanySignature } from './company-signatory.types'

/** Nothing issued yet, out for signature, or signed. A voided agreement reads as none. */
export type ContractStatus = 'none' | 'issued' | 'signed'

/** By the renter on their own link, or at the counter in front of a member of staff. */
export type SigningMethod = 'e_signature' | 'counter'

export interface ContractActionRule {
  allowed: boolean
  /** Why not, when the API said and this portal has words for it. */
  reason?: ContractRefusal
}

/** What the renter's link is built from; the host is the company's own site. */
export interface ContractLink {
  contractId: string
  token: string
}

/** Where a booking's rental agreement stands, as the booking page's card shows it. */
export interface BookingContract {
  status: ContractStatus
  /** "AGR-BK-10001", once an agreement is issued. */
  number?: string
  /** The issued agreement's template, or the one the booking would be issued with. */
  template: { id?: string; name: string; revision: number }
  signedAt?: string
  signerName?: string
  method?: SigningMethod
  /** Who signed for the company, once an agreement is issued. */
  companySigner?: string
  link?: ContractLink
  actions: {
    /** Sending for signature and signing at the counter share one rule. */
    sign: ContractActionRule
    void: ContractActionRule
    changeTemplate: ContractActionRule
  }
}

/** What a signature sends. No `signature` means the typed name is adopted as one. */
export interface SignatureInput {
  signerName: string
  /** The pad's drawing, as a PNG data URL. */
  signature?: string
}

/** open: waiting for a signature. closed: the booking no longer takes one. */
export type PublicContractStatus = 'open' | 'signed' | 'replaced' | 'closed'

interface AgreementSection {
  title: string
  rows: { label: string; value: string }[]
}

/** The agreement as the renter reads it. Amounts and dates arrive worded, as the PDF prints them. */
export interface AgreementContent {
  sections: AgreementSection[]
  charges: { label: string; detail: string; amount: string }[]
  totals: { label: string; amount: string; strong: boolean }[]
  terms: { heading: boolean; text: string }[]
  /** Absent only on an agreement issued before companies signed theirs. */
  companySignature?: CompanySignature
}

export interface PublicContract extends AgreementContent {
  companyName: string
  reference: string
  number: string
  renterName: string
  status: PublicContractStatus
  signedAt?: string
  signerName?: string
}
