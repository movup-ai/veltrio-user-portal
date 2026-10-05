import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useOrganizationStore } from '@/state/organization.store'
import { ApiError } from '@/types/api'
import type {
  AgreementTemplate,
  AgreementTemplateSummary,
  AgreementTemplateValues,
} from '../types/agreement-template.types'
import { AgreementTemplates } from './AgreementTemplates'

const list = vi.fn<() => Promise<AgreementTemplateSummary[]>>()
const get = vi.fn<(id: string) => Promise<AgreementTemplate>>()
const create = vi.fn<(values: AgreementTemplateValues) => Promise<AgreementTemplate>>()
const update = vi.fn<(id: string, values: AgreementTemplateValues) => Promise<AgreementTemplate>>()
const makeDefault = vi.fn<(id: string) => Promise<AgreementTemplate>>()
const remove = vi.fn<(id: string) => Promise<void>>()
const preview = vi.fn<(body: string) => Promise<Blob>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

vi.mock('../api/company-signatory.api', () => ({
  companySignatoryApi: { get: () => Promise.resolve({}) },
}))

// jsdom has no canvas; the pad itself is exercised in a browser.
vi.mock('./SignaturePad', () => ({ SignaturePad: () => null }))

vi.mock('../api/agreement-template.api', () => ({
  agreementTemplateApi: {
    list: () => list(),
    get: (id: string) => get(id),
    create: (values: AgreementTemplateValues) => create(values),
    update: (id: string, values: AgreementTemplateValues) => update(id, values),
    makeDefault: (id: string) => makeDefault(id),
    remove: (id: string) => remove(id),
    preview: (body: string) => preview(body),
  },
}))

const STARTER: AgreementTemplate = {
  id: 'tpl_1',
  name: 'Standard rental agreement',
  revision: 1,
  isDefault: true,
  updatedAt: '2026-10-05T09:00:00Z',
  body: '# Fuel\n\nReturn it full.',
}
const VANS: AgreementTemplate = { ...STARTER, id: 'tpl_2', name: 'Vans', isDefault: false, revision: 4 }

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
          <Route path="/agreements" element={<AgreementTemplates />} />
          <Route path="/agreements/:templateId" element={<AgreementTemplates />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  for (const mock of [list, get, create, update, makeDefault, remove, preview]) mock.mockReset()
  useOrganizationStore.setState({ membership: null })
})

describe('AgreementTemplates', () => {
  it('tells a non-owner who can change templates, without asking the API', () => {
    renderAt('/agreements', 'manager')

    expect(screen.getByText('Only the owner can change agreement templates')).toBeInTheDocument()
    expect(list).not.toHaveBeenCalled()
  })

  it('offers to move the default or delete a template, but neither for the default itself', async () => {
    list.mockResolvedValue([STARTER, VANS])
    makeDefault.mockResolvedValue({ ...VANS, isDefault: true })
    const user = userEvent.setup({ delay: null })
    renderAt('/agreements')

    await user.click(await screen.findByRole('button', { name: 'Actions for Standard rental agreement' }))
    expect(await screen.findByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Make default' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: 'Actions for Vans' }))
    expect(await screen.findByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Make default' }))

    await waitFor(() => expect(makeDefault).toHaveBeenCalledWith('tpl_2'))
  })

  it('deletes a template only after the dialog is confirmed', async () => {
    list.mockResolvedValue([STARTER, VANS])
    remove.mockResolvedValue()
    const user = userEvent.setup({ delay: null })
    renderAt('/agreements')

    await user.click(await screen.findByRole('button', { name: 'Actions for Vans' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))

    expect(await screen.findByRole('heading', { name: 'Delete “Vans”?' })).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Delete template' }))
    await waitFor(() => expect(remove).toHaveBeenCalledWith('tpl_2'))
  })

  it('creates a template and returns to the list', async () => {
    list.mockResolvedValue([STARTER])
    create.mockImplementation(async (values) => ({ ...VANS, ...values }))
    const user = userEvent.setup({ delay: null })
    renderAt('/agreements/new')

    const save = screen.getByRole('button', { name: 'Create template' })
    expect(save).toBeDisabled()
    await user.type(screen.getByLabelText(/Template name/), 'Vans')
    await user.type(screen.getByLabelText(/Terms/), 'Return it full.')
    await user.click(save)

    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Vans', body: 'Return it full.' }))
    // Back on the list, which the page it sits in gives its heading.
    expect(await screen.findByRole('link', { name: 'Standard rental agreement' })).toBeInTheDocument()
  })

  it('asks for the terms before anything is sent', async () => {
    const user = userEvent.setup({ delay: null })
    renderAt('/agreements/new')

    await user.type(screen.getByLabelText(/Template name/), 'Vans')
    await user.click(screen.getByRole('button', { name: 'Create template' }))

    expect(await screen.findByText('Add the terms renters will sign')).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('saves an edit to the template it opened, and is clean again afterwards', async () => {
    get.mockResolvedValue(VANS)
    update.mockImplementation(async (_id, values) => ({ ...VANS, ...values, revision: 5 }))
    const user = userEvent.setup({ delay: null })
    renderAt('/agreements/tpl_2')

    const terms = await screen.findByLabelText(/Terms/)
    expect(terms).toHaveValue('# Fuel\n\nReturn it full.')
    const save = screen.getByRole('button', { name: 'Save changes' })
    await user.type(terms, ' Always.')
    await user.click(save)

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('tpl_2', { name: 'Vans', body: '# Fuel\n\nReturn it full. Always.' }),
    )
    await waitFor(() => expect(save).toBeDisabled())
  })

  it('puts a name another template already has under the name field', async () => {
    get.mockResolvedValue(VANS)
    update.mockRejectedValue(
      new ApiError('conflict', 'A template with this name already exists', {
        status: 409,
        code: 'template_name_taken',
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderAt('/agreements/tpl_2')

    const name = await screen.findByLabelText(/Template name/)
    await user.clear(name)
    await user.type(name, 'Standard rental agreement')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Another template already has this name')).toBeInTheDocument()
    expect(name).toHaveFocus()
  })

  it('previews the text as typed, before it is saved', async () => {
    get.mockResolvedValue(VANS)
    preview.mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }))
    vi.spyOn(window, 'open').mockReturnValue({ location: { href: '' } } as unknown as Window)
    const user = userEvent.setup({ delay: null })
    renderAt('/agreements/tpl_2')

    await user.type(await screen.findByLabelText(/Terms/), ' Always.')
    await user.click(screen.getByRole('button', { name: 'Preview PDF' }))

    await waitFor(() => expect(preview).toHaveBeenCalledWith('# Fuel\n\nReturn it full. Always.'))
    expect(update).not.toHaveBeenCalled()
  })

  it('says so when the template in the address no longer exists', async () => {
    get.mockRejectedValue(new ApiError('not_found', 'Agreement template not found', { status: 404 }))
    renderAt('/agreements/gone')

    expect(await screen.findByText('Template not found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All templates' })).toBeInTheDocument()
  })
})
