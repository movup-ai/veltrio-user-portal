import { Trans } from 'react-i18next'

interface AuthLegalNoticeProps {
  termsUrl?: string
  privacyUrl?: string
}

const linkClass = 'text-fg-2 font-medium underline underline-offset-2 hover:text-foreground'

/** Says nothing until both documents are published: a notice linking nowhere binds no one. */
export function AuthLegalNotice({
  termsUrl = import.meta.env.VITE_TERMS_URL,
  privacyUrl = import.meta.env.VITE_PRIVACY_URL,
}: AuthLegalNoticeProps) {
  if (!termsUrl || !privacyUrl) return null

  return (
    <p className="text-caption text-fg-3 mt-5 text-center text-balance">
      <Trans
        ns="auth"
        i18nKey="legal.notice"
        components={{
          terms: <a href={termsUrl} target="_blank" rel="noreferrer" className={linkClass} />,
          privacy: <a href={privacyUrl} target="_blank" rel="noreferrer" className={linkClass} />,
        }}
      />
    </p>
  )
}
