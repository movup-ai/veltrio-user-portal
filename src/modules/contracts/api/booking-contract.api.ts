import { apiClient } from '@/services/api/client'
import type {
  BookingContract,
  ContractLink,
  PublicContract,
  SignatureInput,
} from '../types/booking-contract.types'
import {
  toBookingContract,
  toPublicContract,
  toSignaturePayload,
  type BookingContractWire,
  type PublicContractWire,
} from './contract.mapper'

const base = (reference: string) => `/bookings/${reference}/contract`
const publicBase = (subdomain: string, { contractId, token }: ContractLink) =>
  `/marketplace/companies/${subdomain}/contracts/${contractId}/${token}`

const contract = (request: Promise<{ data: BookingContractWire }>) =>
  request.then((r) => toBookingContract(r.data))
const publicContract = (request: Promise<{ data: PublicContractWire }>) =>
  request.then((r) => toPublicContract(r.data))

/** A booking's rental agreement: issue it, get it signed, keep the PDF. */
export const bookingContractApi = {
  get: (reference: string): Promise<BookingContract> =>
    contract(apiClient.get<BookingContractWire>(base(reference))),

  /** The agreement in force, issued now if there is none; asking again gives the same one. */
  issue: (reference: string): Promise<BookingContract> =>
    contract(apiClient.post<BookingContractWire>(`${base(reference)}/issue`)),

  /** The signed copy, else the agreement as issued, else a preview; asking never issues one. */
  pdf: (reference: string): Promise<Blob> =>
    apiClient.get<Blob>(`${base(reference)}/pdf`, { responseType: 'blob' }).then((r) => r.data),

  /** The renter signs on the counter's device; the API records who was logged in as the witness. */
  sign: (reference: string, input: SignatureInput): Promise<BookingContract> =>
    contract(apiClient.post<BookingContractWire>(`${base(reference)}/sign`, toSignaturePayload(input))),

  void: (reference: string, reason: string): Promise<BookingContract> =>
    contract(apiClient.post<BookingContractWire>(`${base(reference)}/void`, { reason: reason.trim() })),

  changeTemplate: (reference: string, templateId: string): Promise<BookingContract> =>
    contract(apiClient.put<BookingContractWire>(`${base(reference)}/template`, { templateId })),

  /** The agreement as the renter's link serves it; needs no login. */
  public: (subdomain: string, link: ContractLink): Promise<PublicContract> =>
    publicContract(apiClient.get<PublicContractWire>(publicBase(subdomain, link))),
}
