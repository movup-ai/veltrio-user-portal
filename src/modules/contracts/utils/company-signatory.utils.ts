import type { CompanySignatory, CompanySignatoryInput } from '../types/company-signatory.types'

/** kept: the signature on file. draw: a new one from the pad. typed: the name alone. */
type SignatureMode = 'kept' | 'draw' | 'typed'

/** What the card holds before it is saved. */
export interface SignatoryDraft {
  name: string
  title: string
  mode: SignatureMode
  /** The pad's drawing, while `mode` is `draw`. */
  drawing?: string
}

/** The card as it opens: the signature on file if there is one, else the pad to draw the first. */
export function signatoryDraft(saved: CompanySignatory): SignatoryDraft {
  const mode = saved.signature ? 'kept' : saved.name ? 'typed' : 'draw'
  return { name: saved.name ?? '', title: saved.title ?? '', mode }
}

/** What still stops a save, by the field it belongs under. */
export function signatoryProblems(draft: SignatoryDraft): {
  name?: 'nameRequired'
  signature?: 'signatureRequired'
} {
  return {
    ...(draft.name.trim() ? {} : { name: 'nameRequired' as const }),
    ...(draft.mode === 'draw' && !draft.drawing ? { signature: 'signatureRequired' as const } : {}),
  }
}

/** What to send. A kept signature goes back as it came: a save replaces the whole signatory. */
export function signatoryInput(draft: SignatoryDraft, saved: CompanySignatory): CompanySignatoryInput {
  const signature = draft.mode === 'kept' ? saved.signature : draft.mode === 'draw' ? draft.drawing : undefined
  return { name: draft.name, title: draft.title, signature }
}

export function isSignatoryDirty(draft: SignatoryDraft, saved: CompanySignatory): boolean {
  const opened = signatoryDraft(saved)
  return (
    draft.name !== opened.name ||
    draft.title !== opened.title ||
    draft.mode !== opened.mode ||
    Boolean(draft.drawing)
  )
}
