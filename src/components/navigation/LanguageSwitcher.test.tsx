import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { LanguageSwitcher } from './LanguageSwitcher'

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('LanguageSwitcher', () => {
  it('shows the active language and offers the alternatives', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    expect(screen.getByRole('button', { name: 'Change language' })).toHaveTextContent('EN')

    await user.click(screen.getByRole('button', { name: 'Change language' }))
    expect(screen.getByRole('menuitem', { name: /English/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Español/ })).toBeInTheDocument()
  })

  it('switches the whole UI to Spanish when Español is picked', async () => {
    const user = userEvent.setup()
    render(
      <>
        <LanguageSwitcher />
        <StatusBadge status="On rent" />
      </>,
    )

    expect(screen.getByText('On rent')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Change language' }))
    await user.click(screen.getByRole('menuitem', { name: /Español/ }))

    // The switcher itself, and an unrelated component, both re-render in Spanish.
    expect(screen.getByRole('button', { name: 'Cambiar idioma' })).toHaveTextContent('ES')
    expect(screen.getByText('Alquilado')).toBeInTheDocument()
    expect(screen.queryByText('On rent')).not.toBeInTheDocument()
  })
})
