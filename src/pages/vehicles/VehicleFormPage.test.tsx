import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { VehicleFormPage } from './VehicleFormPage'

const generate = vi.fn()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))
vi.mock('@/modules/vehicles/api/description-ai.api', () => ({
  descriptionAiApi: { generate: (...args: unknown[]) => generate(...args) },
}))
const createDraft = vi.fn((payload: { rateOptions: unknown[] }) =>
  Promise.resolve({ id: 'd1', payload, photos: [] }),
)
vi.mock('@/modules/vehicles/api/vehicle-draft.api', () => ({
  vehicleDraftApi: { create: (payload: { rateOptions: unknown[] }) => createDraft(payload) },
}))
vi.mock('@/modules/locations/hooks/use-locations', () => ({
  useLocationNames: () => ({ names: [], isLoading: false, isError: false, refetch: vi.fn() }),
}))

function renderNew() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/vehicles/new']}>
        <Routes>
          <Route path="/vehicles/new" element={<VehicleFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('VehicleFormPage pricing', () => {
  it('starts a new vehicle with one blank daily rate, ready to fill in', async () => {
    // Every vehicle needs a rate to be bookable, so the step opens on a row, not an empty state.
    const user = userEvent.setup({ delay: null })
    renderNew()

    await user.click(screen.getByRole('button', { name: 'Save draft & exit' }))

    await waitFor(() => expect(createDraft).toHaveBeenCalledTimes(1))
    expect(createDraft.mock.calls[0][0].rateOptions).toEqual([
      expect.objectContaining({ label: '', basis: 'day', rate: Number.NaN, unlimitedMileage: false }),
    ])
  })
})

describe('VehicleFormPage description writer', () => {
  it('sends the user to the make when Generate is pressed before the car is named', async () => {
    const user = userEvent.setup({ delay: null })
    renderNew()

    await user.click(screen.getByRole('button', { name: 'Generate' }))

    // Focus is what shows where to type: the button sits a screen below the field.
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Make' })).toHaveFocus())
    expect(screen.getByText('Make is required')).toBeInTheDocument()
    expect(generate).not.toHaveBeenCalled()
  })
})
