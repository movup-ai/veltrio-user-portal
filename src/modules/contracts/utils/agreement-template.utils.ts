/** Where the agreement templates live. */
export const AGREEMENTS_PATH = '/agreements'

/** Stands in for an id in the editor's URL while the template does not exist yet. */
export const NEW_TEMPLATE = 'new'

export function agreementTemplatePath(id: string): string {
  return `${AGREEMENTS_PATH}/${id}`
}
