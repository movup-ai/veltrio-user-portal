import { useEffect } from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'
import i18n from '@/i18n'

/** Keeps <html lang> in sync with the active language so screen readers and `:lang()` CSS follow it. */
function HtmlLangSync({ children }: { children: React.ReactNode }) {
  const { i18n: instance } = useTranslation()
  const language = instance.resolvedLanguage ?? instance.language

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return children
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <HtmlLangSync>{children}</HtmlLangSync>
    </I18nextProvider>
  )
}
