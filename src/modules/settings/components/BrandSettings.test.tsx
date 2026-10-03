import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { toast } from '@/components/ui/use-toast'
import { useOrganizationStore } from '@/state/organization.store'
import type { Brand, BrandAsset, BrandValues } from '../types/brand.types'
import type { Company } from '../types/company.types'
import { BrandSettings } from './BrandSettings'

const getBrand = vi.fn<() => Promise<Brand>>()
const update = vi.fn<(patch: Partial<BrandValues>) => Promise<Brand>>()
const upload = vi.fn<(asset: BrandAsset, file: File) => Promise<Brand>>()
const remove = vi.fn<(asset: BrandAsset) => Promise<Brand>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('@/modules/vehicles/hooks/use-vehicles', () => ({ useVehicles: () => ({ data: { items: [] } }) }))
vi.mock('../api/brand.api', () => ({
  brandApi: {
    get: () => getBrand(),
    update: (patch: Partial<BrandValues>) => update(patch),
    upload: (asset: BrandAsset, file: File) => upload(asset, file),
    remove: (asset: BrandAsset) => remove(asset),
  },
}))
vi.mock('../api/company.api', () => ({ companyApi: { get: () => Promise.resolve(COMPANY), update: vi.fn() } }))

const COMPANY: Company = {
  id: 't_1',
  name: 'Sunstate Car Co.',
  subdomain: 'sunstate',
  fleetSize: '11_50',
  country: 'US',
  timezone: 'America/New_York',
  currency: 'USD',
  currencyLocked: false,
  description: 'Family-run rentals in Miami.',
}

const BRAND: Brand = { primaryColor: '#0F766E', backgroundColor: '#FFFFFF', textColor: '#111827' }

function renderAs(role: 'owner' | 'manager') {
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
      <BrandSettings />
    </QueryClientProvider>,
  )
}

const preview = () => within(screen.getByTestId('brand-preview-site'))

beforeEach(() => {
  // jsdom has no object URLs; the field makes one for the instant preview.
  URL.createObjectURL = vi.fn(() => 'blob:local-logo')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  getBrand.mockReset()
  update.mockReset()
  upload.mockReset()
  remove.mockReset()
  vi.mocked(toast).mockReset()
  useOrganizationStore.setState({ membership: null })
})

describe('BrandSettings', () => {
  it('redraws the preview as colours and headline are typed, before anything is saved', async () => {
    getBrand.mockResolvedValue(BRAND)
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    const primary = await screen.findByLabelText('Primary color')
    await user.clear(primary)
    await user.type(primary, '#E11D48')
    await user.type(screen.getByLabelText('Headline'), 'Drive Miami your way')

    expect(preview().getByText('Book now')).toHaveStyle({ backgroundColor: '#E11D48' })
    expect(preview().getByRole('heading', { name: 'Drive Miami your way' })).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

  it('keeps the saved colour in the preview while a code is half typed', async () => {
    getBrand.mockResolvedValue(BRAND)
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    const primary = await screen.findByLabelText('Primary color')
    await user.clear(primary)
    await user.type(primary, '#E1')

    expect(preview().getByText('Book now')).toHaveStyle({ backgroundColor: '#0F766E' })
  })

  it('saves only the fields that changed', async () => {
    getBrand.mockResolvedValue(BRAND)
    update.mockImplementation(async (patch) => ({ ...BRAND, ...patch }))
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    const background = await screen.findByLabelText('Background color')
    await user.clear(background)
    await user.type(background, '#F8FAFC')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({ backgroundColor: '#F8FAFC' }))
  })

  it('uploads a picked logo at once, showing it in the preview while it uploads', async () => {
    getBrand.mockResolvedValue(BRAND)
    let finish: (brand: Brand) => void = () => {}
    upload.mockImplementation(() => new Promise((resolve) => (finish = resolve)))
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    const file = new File(['png'], 'logo.png', { type: 'image/png' })
    await user.upload(await screen.findByLabelText(/^Logo$/), file)

    expect(upload).toHaveBeenCalledWith('logo', file)
    expect(preview().getByRole('img', { name: 'Sunstate Car Co.' })).toHaveAttribute('src', 'blob:local-logo')

    finish({ ...BRAND, logoUrl: 'https://media.example/logo.webp' })
    await waitFor(() =>
      expect(preview().getByRole('img', { name: 'Sunstate Car Co.' })).toHaveAttribute('src', 'https://media.example/logo.webp'),
    )
  })

  it('offers a remove button only for an image that is there', async () => {
    getBrand.mockResolvedValue({ ...BRAND, bannerUrl: 'https://media.example/banner.webp' })
    remove.mockResolvedValue(BRAND)
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    await user.click(await screen.findByRole('button', { name: 'Remove banner' }))
    expect(screen.queryByRole('button', { name: 'Remove logo' })).not.toBeInTheDocument()

    expect(remove).toHaveBeenCalledWith('banner')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove banner' })).not.toBeInTheDocument())
  })

  it('refuses a file that is not an image, without uploading it', async () => {
    getBrand.mockResolvedValue(BRAND)
    const user = userEvent.setup({ delay: null, applyAccept: false })
    renderAs('owner')

    await user.upload(await screen.findByLabelText(/^Banner$/), new File(['%PDF'], 'menu.pdf', { type: 'application/pdf' }))

    expect(upload).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Use a JPG, PNG, WebP, HEIC or AVIF image.' }))
  })

  it('tells a non-owner who can change the brand, without asking the API', () => {
    renderAs('manager')

    expect(screen.getByText('Only the owner can change company settings')).toBeInTheDocument()
    expect(getBrand).not.toHaveBeenCalled()
  })
})
