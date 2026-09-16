import { describe, expect, it } from 'vitest'
import i18n from './index'
import { LANGUAGES } from './languages'
import { NAMESPACES, resources } from './resources'

type Json = Record<string, unknown>

/** Flattens a nested catalogue into dotted paths so two locales can be compared key-for-key. */
function flatten(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? flatten(value as Json, path)
      : [path]
  })
}

describe('i18n catalogue', () => {
  it.each(NAMESPACES)('has identical keys in every locale for "%s"', (namespace) => {
    const en = flatten(resources.en[namespace] as Json).sort()

    for (const { code } of LANGUAGES) {
      if (code === 'en') continue
      const other = flatten(resources[code][namespace] as Json).sort()

      expect({ locale: code, namespace, keys: other }).toEqual({ locale: code, namespace, keys: en })
    }
  })

  it('has no empty translation values', () => {
    for (const { code } of LANGUAGES) {
      for (const namespace of NAMESPACES) {
        const catalogue = resources[code][namespace] as Json
        for (const path of flatten(catalogue)) {
          const value = path.split('.').reduce<unknown>((acc, key) => (acc as Json)?.[key], catalogue)
          // billingBasisSuffix.fixed is intentionally blank — a fixed-length rate has no "/unit".
          if (path === 'billingBasisSuffix.fixed') continue
          expect(value, `${code}:${namespace}.${path}`).not.toBe('')
        }
      }
    }
  })
})

describe('language switching', () => {
  it('resolves the same key differently per language', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('vehicles:list.title')).toBe('Vehicles')

    await i18n.changeLanguage('es')
    expect(i18n.t('vehicles:list.title')).toBe('Vehículos')

    await i18n.changeLanguage('en')
  })

  it('translates canonical domain values without mutating them', async () => {
    await i18n.changeLanguage('es')
    expect(i18n.t('domain:status.On rent')).toBe('Alquilado')
    expect(i18n.t('domain:status.Out of service')).toBe('Fuera de servicio')

    await i18n.changeLanguage('en')
  })

  it('falls back to a regional Spanish tag', async () => {
    await i18n.changeLanguage('es-MX')
    expect(i18n.resolvedLanguage).toBe('es')
    expect(i18n.t('common:actions.cancel')).toBe('Cancelar')

    await i18n.changeLanguage('en')
  })
})
