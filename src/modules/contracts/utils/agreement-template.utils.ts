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
 * Without the list the choice goes as it stands: dropping it would book on terms nobody picked.
 */
export function templateChoice(chosen: string | undefined, templates: Pickable[] | undefined): string | undefined {
  if (!templates) return chosen || undefined
  const picked = templates.find((t) => t.id === chosen)
  return picked && !picked.isDefault ? picked.id : undefined
}
