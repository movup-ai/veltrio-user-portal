import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ApiError } from '@/types/api'
import type { CompanySignatory, CompanySignatoryInput } from '../types/company-signatory.types'
import { CompanySignatoryCard } from './CompanySignatoryCard'

const DRAWING = 'data:image/png;base64,NEW'
const ON_FILE = 'data:image/png;base64,SAVED'

const get = vi.fn<() => Promise<CompanySignatory>>()
const save = vi.fn<(input: CompanySignatoryInput) => Promise<CompanySignatory>>()
const remove = vi.fn<() => Promise<void>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

vi.mock('../api/company-signatory.api', () => ({
  companySignatoryApi: {
    get: () => get(),
    save: (input: CompanySignatoryInput) => save(input),
    remove: () => remove(),
  },
}))

// jsdom has no canvas; a button stands in for drawing a stroke on the pad.
vi.mock('./SignaturePad', () => ({
  SignaturePad: ({ onChange }: { onChange: (drawing: string | undefined) => void }) => (
    <button type="button" onClick={() => onChange(DRAWING)}>
      draw
    </button>
  ),
}))

const SAVED: CompanySignatory = { name: 'Edward Thomas', title: 'Owner', signature: ON_FILE }

function renderCard() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CompanySignatoryCard />
    </QueryClientProvider>,
  )
}

const saveButton = () => screen.getByRole('button', { name: 'Save changes' })

afterEach(() => {
  for (const mock of [get, save, remove]) mock.mockReset()
})

describe('CompanySignatoryCard', () => {
  it('says who signs until one is set, then saves the name, title and drawing', async () => {
    get.mockResolvedValue({})
    save.mockImplementation(async (input) => input)
    const user = userEvent.setup({ delay: null })
    renderCard()

    expect(await screen.findByText(/Until you set one, each agreement is signed for your company/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/Signatory name/), 'Edward Thomas')
    await user.type(screen.getByLabelText('Title'), 'Owner')
    await user.click(saveButton())
    // A name alone is not enough while the pad is showing and empty.
    expect(await screen.findByText('Draw your signature, or choose to use your typed name.')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'draw' }))
    await user.click(saveButton())

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({ name: 'Edward Thomas', title: 'Owner', signature: DRAWING }),
    )
  })

  it('sends the signature on file back when only the title changes', async () => {
    get.mockResolvedValue(SAVED)
    save.mockImplementation(async (input) => input)
    const user = userEvent.setup({ delay: null })
    renderCard()

    expect(await screen.findByRole('img', { name: 'Signature of Edward Thomas' })).toHaveAttribute('src', ON_FILE)
    expect(saveButton()).toBeDisabled()
    await user.type(screen.getByLabelText('Title'), ' and Director')
    await user.click(saveButton())

    // A save replaces the whole signatory, so leaving the drawing out would erase it.
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({ name: 'Edward Thomas', title: 'Owner and Director', signature: ON_FILE }),
    )
  })

  it('swaps the signature on file for an empty pad from the pencil in its corner, to draw a new one', async () => {
    get.mockResolvedValue(SAVED)
    save.mockImplementation(async (input) => input)
    const user = userEvent.setup({ delay: null })
    renderCard()

    await user.click(await screen.findByRole('button', { name: 'Draw a new one' }))
    expect(screen.queryByRole('img', { name: 'Signature of Edward Thomas' })).not.toBeInTheDocument()
    await user.click(saveButton())
    // The one on file is replaced only by a drawing: an empty pad saves nothing.
    expect(await screen.findByText('Draw your signature, or choose to use your typed name.')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'draw' }))
    await user.click(saveButton())
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({ name: 'Edward Thomas', title: 'Owner', signature: DRAWING }),
    )
  })

  it('brings the signature on file back when the new drawing is discarded', async () => {
    get.mockResolvedValue(SAVED)
    const user = userEvent.setup({ delay: null })
    renderCard()

    await user.click(await screen.findByRole('button', { name: 'Draw a new one' }))
    await user.click(screen.getByRole('button', { name: 'draw' }))
    await user.click(screen.getByRole('button', { name: 'Discard' }))

    expect(screen.getByRole('img', { name: 'Signature of Edward Thomas' })).toHaveAttribute('src', ON_FILE)
    expect(save).not.toHaveBeenCalled()
  })

  it('signs with the typed name when that is chosen, and returns to the one on file when it is not', async () => {
    get.mockResolvedValue(SAVED)
    save.mockImplementation(async (input) => input)
    const user = userEvent.setup({ delay: null })
    renderCard()

    const typed = await screen.findByRole('checkbox', { name: /Sign with the typed name/ })
    await user.click(typed)
    expect(screen.queryByRole('img', { name: 'Signature of Edward Thomas' })).not.toBeInTheDocument()
    await user.click(typed)
    expect(screen.getByRole('img', { name: 'Signature of Edward Thomas' })).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    await user.click(typed)
    await user.click(saveButton())
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({ name: 'Edward Thomas', title: 'Owner', signature: undefined }),
    )
  })

  it("shows the API's refusal of a drawing under the pad", async () => {
    get.mockResolvedValue({})
    save.mockRejectedValue(new ApiError('validation', 'no', { status: 422, code: 'signature_invalid' }))
    const user = userEvent.setup({ delay: null })
    renderCard()

    await user.type(await screen.findByLabelText(/Signatory name/), 'Edward Thomas')
    await user.click(screen.getByRole('button', { name: 'draw' }))
    await user.click(saveButton())

    expect(await screen.findByText("We couldn't read that signature. Clear it and try again.")).toBeInTheDocument()
  })

  it('removes the signatory, back to agreements signed by whoever issues them', async () => {
    get.mockResolvedValue(SAVED)
    remove.mockResolvedValue()
    const user = userEvent.setup({ delay: null })
    renderCard()

    await user.click(await screen.findByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(remove).toHaveBeenCalled())
    expect(await screen.findByText(/Until you set one, each agreement is signed for your company/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Signatory name/)).toHaveValue('')
  })
})
