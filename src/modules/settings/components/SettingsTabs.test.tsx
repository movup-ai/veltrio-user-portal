import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { SettingsTabs } from './SettingsTabs'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsTabs />
    </MemoryRouter>,
  )
}

describe('SettingsTabs', () => {
  it('marks General as the current page on a general settings route below /settings', () => {
    renderAt('/settings/users')

    expect(screen.getByRole('link', { name: 'General' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Payments' })).not.toHaveAttribute('aria-current')
  })

  it('marks only Payments on the payments page', () => {
    renderAt('/settings/payments')

    expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'General' })).not.toHaveAttribute('aria-current')
  })
})
