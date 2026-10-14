import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { AuthLegalNotice } from './AuthLegalNotice'

describe('AuthLegalNotice', () => {
  it('links both documents beside the sign-up form', () => {
    render(<AuthLegalNotice termsUrl="https://veltrio.io/terms" privacyUrl="https://veltrio.io/privacy" />)

    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
      'href',
      'https://veltrio.io/terms',
    )
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      'https://veltrio.io/privacy',
    )
  })

  it.each([
    ['no documents', undefined, undefined],
    ['only the terms', 'https://veltrio.io/terms', undefined],
  ])('says nothing with %s published', (_, termsUrl, privacyUrl) => {
    const { container } = render(<AuthLegalNotice termsUrl={termsUrl} privacyUrl={privacyUrl} />)

    expect(container).toBeEmptyDOMElement()
  })
})
