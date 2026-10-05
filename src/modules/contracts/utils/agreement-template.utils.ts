/** Where the agreement templates live. */
export const AGREEMENTS_PATH = '/agreements'

/** Stands in for an id in the editor's URL while the template does not exist yet. */
export const NEW_TEMPLATE = 'new'

export function agreementTemplatePath(id: string): string {
  return `${AGREEMENTS_PATH}/${id}`
}

type Pickable = { id: string; isDefault: boolean }

/** The template a picker shows selected: the one chosen while it still exists, else the default. */
export function shownTemplateId(chosen: string | undefined, templates: Pickable[]): string | undefined {
  return (templates.find((t) => t.id === chosen) ?? templates.find((t) => t.isDefault))?.id
}

/**
 * The template to send with a new booking, or undefined to leave it on the company's default.
 * The default is never named: a booking left on it should follow the default if that moves.
 */
export function templateChoice(chosen: string | undefined, templates: Pickable[]): string | undefined {
  const picked = templates.find((t) => t.id === chosen)
  return picked && !picked.isDefault ? picked.id : undefined
}

/**
 * Whether a draft's choice still waits on the list. Sent unchecked it could pin the booking to
 * what is today's default; dropped, the booking is made on terms nobody picked.
 */
export function isChoiceUnchecked(chosen: string | undefined, templates: Pickable[] | undefined): boolean {
  return Boolean(chosen) && !templates
}
