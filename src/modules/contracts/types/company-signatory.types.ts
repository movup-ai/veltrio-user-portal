/** Who signs agreements for the company. Every field is absent until the owner sets one. */
export interface CompanySignatory {
  name?: string
  title?: string
  /** Their drawn signature as a PNG data URL; absent when they sign with their typed name. */
  signature?: string
}

/** What saving sends. No `signature` signs with the typed name. */
export interface CompanySignatoryInput {
  name: string
  title: string
  signature?: string
}

/** The company's signature as one agreement carries it, frozen when that agreement was issued. */
export interface CompanySignature {
  /** Who the renter contracts with: the legal name where the company has one. */
  company: string
  name: string
  title: string
  signature?: string
  /** The date it was applied, already worded. */
  signed: string
  /** The member of staff who issued the agreement, which is when the signature was applied. */
  issuedBy: string
}
