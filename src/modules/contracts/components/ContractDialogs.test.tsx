import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { AgreementTemplateSummary } from '../types/agreement-template.types'
import type { BookingContract } from '../types/booking-contract.types'
import { ChangeTemplateDialog } from './ContractDialogs'

const list = vi.fn<() => Promise<AgreementTemplateSummary[]>>()
const changeTemplate = vi.fn<(reference: string, templateId: string) => Promise<BookingContract>>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

vi.mock('../api/agreement-template.api', () => ({
  agreementTemplateApi: { list: () => list() },
}))

vi.mock('../api/booking-contract.api', () => ({
  bookingContractApi: {
    changeTemplate: (reference: string, templateId: string) => changeTemplate(reference, templateId),
  },
}))

const TEMPLATES: AgreementTemplateSummary[] = [
  { id: 'std', name: 'Standard rental agreement', revision: 3, isDefault: true, updatedAt: '2026-10-01T12:00:00Z' },
  { id: 'vans', name: 'Vans and trucks', revision: 1, isDefault: false, updatedAt: '2026-10-02T12:00:00Z' },
]

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onOpenChange = vi.fn<(open: boolean) => void>()
  const ui = (open: boolean) => (
    <QueryClientProvider client={client}>
      <ChangeTemplateDialog reference="BK-10001" currentId="std" open={open} onOpenChange={onOpenChange} />
    </QueryClientProvider>
  )
  const { rerender } = render(ui(true))
  return { onOpenChange, show: (open: boolean) => rerender(ui(open)) }
}

async function pick(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('combobox', { name: 'Template' }))
  await user.click(await screen.findByRole('option', { name }))
}

const save = () => screen.getByRole('button', { name: 'Use this template' })

afterEach(() => {
  for (const mock of [list, changeTemplate]) mock.mockReset()
})

describe('ChangeTemplateDialog', () => {
  it('opens on the terms the booking has, with nothing to save until another is picked', async () => {
    list.mockResolvedValue(TEMPLATES)
    changeTemplate.mockResolvedValue({} as BookingContract)
    const user = userEvent.setup({ delay: null })
    const { onOpenChange } = renderDialog()

    expect(await screen.findByRole('combobox', { name: 'Template' })).toHaveTextContent(
      'Standard rental agreement (default)',
    )
    expect(save()).toBeDisabled()

    await pick(user, 'Vans and trucks')
    await user.click(save())

    await waitFor(() => expect(changeTemplate).toHaveBeenCalledWith('BK-10001', 'vans'))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('forgets a pick that was cancelled, so reopening cannot save it by mistake', async () => {
    list.mockResolvedValue(TEMPLATES)
    const user = userEvent.setup({ delay: null })
    const { onOpenChange, show } = renderDialog()

    await pick(user, 'Vans and trucks')
    expect(save()).toBeEnabled()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    show(false)
    show(true)

    expect(await screen.findByRole('combobox', { name: 'Template' })).toHaveTextContent(
      'Standard rental agreement (default)',
    )
    expect(save()).toBeDisabled()
    expect(changeTemplate).not.toHaveBeenCalled()
  })
})
