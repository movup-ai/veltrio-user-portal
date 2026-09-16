import type { DEFAULT_NAMESPACE, resources } from './resources'

/**
 * Makes `t('vehicles:list.title')` autocomplete and fail the build on a typo or a key that
 * only exists in one locale. English is the source of truth for the key shape.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE
    resources: (typeof resources)['en']
    returnNull: false
  }
}
