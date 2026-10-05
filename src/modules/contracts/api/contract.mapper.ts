import { CONTRACT_REFUSALS, type ContractRefusal } from '../constants/booking-contract.constants'
import type {
  AgreementTemplate,
  AgreementTemplateSummary,
  AgreementTemplateValues,
} from '../types/agreement-template.types'
import type {
  CompanySignatory,
  CompanySignatoryInput,
  CompanySignature,
} from '../types/company-signatory.types'
import type {
  AgreementContent,
  BookingContract,
  ContractActionRule,
  ContractLink,
  ContractStatus,
  PublicContract,
  PublicContractStatus,
  SignatureInput,
  SigningMethod,
} from '../types/booking-contract.types'

// --- Agreement templates ---

export interface AgreementTemplateSummaryWire {
  id: string
  name: string
  revision: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface AgreementTemplateWire extends AgreementTemplateSummaryWire {
  body: string
}

export function toAgreementTemplateSummary(wire: AgreementTemplateSummaryWire): AgreementTemplateSummary {
  return {
    id: wire.id,
    name: wire.name,
    revision: wire.revision,
    isDefault: wire.isDefault,
    updatedAt: wire.updatedAt,
  }
}

export function toAgreementTemplate(wire: AgreementTemplateWire): AgreementTemplate {
  return { ...toAgreementTemplateSummary(wire), body: wire.body }
}

/** Trimmed as the API stores it, so the text compared for a new revision is the text saved. */
export function toAgreementTemplatePayload(values: AgreementTemplateValues): AgreementTemplateValues {
  return { name: values.name.trim(), body: values.body.trim() }
}

// --- Booking contracts ---

interface ContractActionWire {
  allowed: boolean
  reason: string | null
}

export interface BookingContractWire {
  status: ContractStatus
  number: string | null
  template: { id: string | null; name: string; revision: number }
  signedAt: string | null
  signerName: string | null
  method: SigningMethod | null
  companySigner: string | null
  link: ContractLink | null
  actions: { sign: ContractActionWire; void: ContractActionWire; changeTemplate: ContractActionWire }
}

interface CompanySignatureWire extends Omit<CompanySignature, 'signature'> {
  signature: string | null
}

export interface PublicContractWire extends Omit<AgreementContent, 'companySignature'> {
  companySignature: CompanySignatureWire | null
  companyName: string
  reference: string
  number: string
  renterName: string
  status: PublicContractStatus
  signedAt: string | null
  signerName: string | null
}

/** A reason this portal has no words for is dropped: the button is still off, just unexplained. */
function toRule(wire: ContractActionWire): ContractActionRule {
  const known = (CONTRACT_REFUSALS as readonly string[]).includes(wire.reason ?? '')
  return { allowed: wire.allowed, reason: known ? (wire.reason as ContractRefusal) : undefined }
}

export function toBookingContract(wire: BookingContractWire): BookingContract {
  return {
    status: wire.status,
    number: wire.number ?? undefined,
    template: { ...wire.template, id: wire.template.id ?? undefined },
    signedAt: wire.signedAt ?? undefined,
    signerName: wire.signerName ?? undefined,
    method: wire.method ?? undefined,
    companySigner: wire.companySigner ?? undefined,
    link: wire.link ?? undefined,
    actions: {
      sign: toRule(wire.actions.sign),
      void: toRule(wire.actions.void),
      changeTemplate: toRule(wire.actions.changeTemplate),
    },
  }
}

export function toPublicContract(wire: PublicContractWire): PublicContract {
  const signed = wire.companySignature
  return {
    ...wire,
    companySignature: signed ? { ...signed, signature: signed.signature ?? undefined } : undefined,
    signedAt: wire.signedAt ?? undefined,
    signerName: wire.signerName ?? undefined,
  }
}

/** Consent is sent as given: the form cannot be submitted without it, and the API insists on it. */
export function toSignaturePayload(input: SignatureInput) {
  return { signerName: input.signerName.trim(), signature: input.signature ?? null, consent: true as const }
}

// --- Company signatory ---

export interface CompanySignatoryWire {
  name: string | null
  title: string | null
  signature: string | null
  updatedAt: string | null
}

export function toCompanySignatory(wire: CompanySignatoryWire): CompanySignatory {
  return {
    name: wire.name ?? undefined,
    title: wire.title ?? undefined,
    signature: wire.signature ?? undefined,
  }
}

/** An explicit null signs with the typed name; the API replaces the whole signatory on a save. */
export function toCompanySignatoryPayload(input: CompanySignatoryInput) {
  return { name: input.name.trim(), title: input.title.trim(), signature: input.signature ?? null }
}
