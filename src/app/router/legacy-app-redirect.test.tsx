import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LegacyAppRedirect } from './legacy-app-redirect'

function WhereWeLanded() {
  const { pathname, search } = useLocation()
  return <p>{`${pathname}${search}`}</p>
}

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/app/*" element={<LegacyAppRedirect />} />
        <Route path="*" element={<WhereWeLanded />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LegacyAppRedirect', () => {
  it('sends an old /app link to the same page, query and all', () => {
    // Stripe returns here with the query it was given before /app went away.
    renderAt('/app/settings/payments?stripe=return')
    expect(screen.getByText('/settings/payments?stripe=return')).toBeInTheDocument()
  })

  it('sends /app itself to the home page', () => {
    renderAt('/app')
    expect(screen.getByText('/')).toBeInTheDocument()
  })
})
