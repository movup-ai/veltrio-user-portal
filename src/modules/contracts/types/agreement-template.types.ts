/** A template without its text: what the list and the booking wizard's picker show. */
export interface AgreementTemplateSummary {
  id: string
  name: string
  /** Counts edits to the text, so an agreement can say which wording it was issued with. */
  revision: number
  /** Used for a booking that names no template. Exactly one per company. */
  isDefault: boolean
  updatedAt: string
}

export interface AgreementTemplate extends AgreementTemplateSummary {
  body: string
}

/** The editor's form, and what a create or a save sends. */
export interface AgreementTemplateValues {
  name: string
  body: string
}
