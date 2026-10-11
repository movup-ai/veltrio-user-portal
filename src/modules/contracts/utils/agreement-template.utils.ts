/** Where the agreement templates live. */
export const AGREEMENTS_PATH = '/agreements'

/** Stands in for an id in the editor's URL while the template does not exist yet. */
export const NEW_TEMPLATE = 'new'

export function agreementTemplatePath(id: string): string {
  return `${AGREEMENTS_PATH}/${id}`
}

/** The template an older draft named, from when the booking form still picked the terms. */
export function draftTemplateId(payload: Record<string, unknown> | undefined): string | undefined {
  const saved = payload?.agreementTemplateId
  return typeof saved === 'string' && saved ? saved : undefined
}

/**
 * What such a draft's choice comes to now that every booking starts on the default terms:
 * nothing when it named the default or a template since deleted, else the terms it loses.
 * Unnamed while the list is not in: silence then could hide a real change of terms.
 */
export function lostDraftTerms(
  savedId: string | undefined,
  templates: { id: string; name: string; isDefault: boolean }[] | undefined,
): { name?: string } | undefined {
  if (!savedId) return undefined
  if (!templates) return {}
  const picked = templates.find((template) => template.id === savedId)
  return picked && !picked.isDefault ? { name: picked.name } : undefined
}
