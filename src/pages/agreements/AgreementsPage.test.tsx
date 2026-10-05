import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import { AgreementsPage } from './AgreementsPage'

vi.mock('@/modules/contracts/api/company-signatory.api', () => ({
  companySignatoryApi: { get: () => Promise.resolve({}) },
}))

// jsdom has no canvas; the pad itself is exercised in a browser.
vi.mock('@/modules/contracts/components/SignaturePad', () => ({ SignaturePad: () => null }))

vi.mock('@/modules/contracts/api/agreement-template.api', () => ({
  agreementTemplateApi: {
    list: () =>
      Promise.resolve([
        { id: 'tpl_1', name: 'Standard rental agreement', revision: 1, isDefault: true, updatedAt: '2026-10-05T09:00:00Z' },
      ]),
  },
}))

function renderAt(path: string, role: 'owner' | 'manager' = 'owner') {
  useOrganizationStore.setState({
    membership: {
      organizationId: 't_1',
      organizationName: 'Sunstate Car Co.',
      subdomain: 'sunstate',
      currency: 'USD',
      role,
      permissions: role === 'owner' ? ['settings.manage'] : [],
    },
  })
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/agreements" element={<AgreementsPage />} />
          <Route path="/agreements/:templateId" element={<AgreementsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => useOrganizationStore.setState({ membership: null }))

describe('AgreementsPage', () => {
  it('opens a new template from the page header, which then steps aside for the editor', async () => {
    const user = userEvent.setup({ delay: null })
    renderAt('/agreements')

    expect(screen.getByRole('heading', { name: 'Agreement templates' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Standard rental agreement' })).toBeInTheDocument()
    // Under the templates: who signs them for the company.
    expect(await screen.findByRole('heading', { name: 'Company signature' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'New template' }))

    expect(await screen.findByRole('button', { name: 'Create template' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New template' })).not.toBeInTheDocument()
  })

  it('offers no New template to someone who cannot change templates', () => {
    renderAt('/agreements', 'manager')

    expect(screen.getByText('Only the owner can change agreement templates')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New template' })).not.toBeInTheDocument()
  })
})
