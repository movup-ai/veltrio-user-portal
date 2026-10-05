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

  it('names each colour swatch after its field, so a screen reader can tell them apart', async () => {
    getBrand.mockResolvedValue(BRAND)
    renderAs('owner')

    expect(await screen.findByLabelText('Pick primary color')).toHaveAttribute('type', 'color')
    expect(screen.getByLabelText('Pick background color')).toHaveAttribute('type', 'color')
    expect(screen.getByLabelText('Pick text color')).toHaveAttribute('type', 'color')
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

  it('keeps a just-uploaded logo when an older colour save answers after it', async () => {
    getBrand.mockResolvedValue(BRAND)
    let finishSave: (brand: Brand) => void = () => {}
    update.mockImplementation(() => new Promise((resolve) => (finishSave = resolve)))
    upload.mockResolvedValue({ ...BRAND, logoUrl: 'https://media.example/logo.webp' })
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    const background = await screen.findByLabelText('Background color')
    await user.clear(background)
    await user.type(background, '#F8FAFC')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await user.upload(screen.getByLabelText(/^Logo$/), new File(['png'], 'logo.png', { type: 'image/png' }))
    await waitFor(() =>
      expect(preview().getByRole('img', { name: 'Sunstate Car Co.' })).toHaveAttribute('src', 'https://media.example/logo.webp'),
    )

    // The save was handled before the upload, so its answer has no logo in it.
    finishSave({ ...BRAND, backgroundColor: '#F8FAFC' })

    // The toast fires once that answer has been applied to the cache.
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' })))
    expect(preview().getByRole('img', { name: 'Sunstate Car Co.' })).toHaveAttribute('src', 'https://media.example/logo.webp')
  })

  it('takes one image at a time, so a second pick cannot be clobbered by the first', async () => {
    getBrand.mockResolvedValue(BRAND)
    upload.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    const input = await screen.findByLabelText(/^Logo$/)
    await user.upload(input, new File(['a'], 'first.png', { type: 'image/png' }))
    await user.upload(input, new File(['b'], 'second.png', { type: 'image/png' }))

    expect(input).toBeDisabled()
    expect(upload).toHaveBeenCalledTimes(1)
  })

  it('keeps what is typed while a save is in flight', async () => {
    getBrand.mockResolvedValue(BRAND)
    let finishSave: (brand: Brand) => void = () => {}
    update.mockImplementation(() => new Promise((resolve) => (finishSave = resolve)))
    const user = userEvent.setup({ delay: null })
    renderAs('owner')

    const headline = await screen.findByLabelText('Headline')
    await user.type(headline, 'Drive Miami')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await user.type(headline, ' your way')
    finishSave({ ...BRAND, headline: 'Drive Miami' })

    await waitFor(() => expect(update).toHaveBeenCalledWith({ headline: 'Drive Miami' }))
    // Still there, and still unsaved, so Save is offered again.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled())
    expect(headline).toHaveValue('Drive Miami your way')
  })

  it('allows a banner up to 15 MB but a logo only up to 10', async () => {
    getBrand.mockResolvedValue(BRAND)
    upload.mockResolvedValue(BRAND)
    const user = userEvent.setup({ delay: null })
    renderAs('owner')
    const photo = (name: string) => {
      const file = new File(['x'], name, { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 12 * 1024 * 1024 })
      return file
    }

    await user.upload(await screen.findByLabelText(/^Logo$/), photo('logo.jpg'))
    expect(upload).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Use an image under 10 MB.' }))

    const banner = photo('banner.jpg')
    await user.upload(screen.getByLabelText(/^Banner$/), banner)
    expect(upload).toHaveBeenCalledWith('banner', banner)
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
