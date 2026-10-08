import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { VerificationRecord } from '@/modules/bookings/types/booking.types'

const orderMutate = vi.fn()
const share = vi.fn()
const openReport = vi.fn()
const removeCheck = vi.fn()
let logItems: VerificationRecord[] = []
let permissions: string[] = []

vi.mock('@/components/feedback/Can', () => ({ usePermissions: () => permissions }))

vi.mock('@/modules/bookings/hooks/use-verification', () => ({
  useOrderStandaloneVerification: () => ({ mutate: orderMutate, isPending: false }),
  useInsuranceLinkDialog: () => ({
    share,
    sharing: false,
    dialog: { open: false, onOpenChange: vi.fn(), session: undefined },
  }),
  useInsuranceResults: () => false,
  useVerificationLog: () => ({ data: { items: logItems, total: logItems.length }, isError: false }),
  useVerificationReportById: () => ({ open: openReport, isPending: false }),
  useDeleteVerification: () => ({ mutate: removeCheck, isPending: false }),
}))
vi.mock('@/modules/bookings/components/InsuranceLinkDialog', () => ({
  InsuranceLinkDialog: () => null,
}))
// The calendar popover is not what these tests are about; a plain input stands in for it.
vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) => (
    <input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

const { VerificationPage } = await import('./VerificationPage')

async function fillPerson(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Full name/), 'Jordan Reyes')
  await user.type(screen.getByLabelText(/Date of birth/), '1990-06-01')
}

beforeEach(() => {
  orderMutate.mockReset()
  share.mockReset()
  openReport.mockReset()
  removeCheck.mockReset()
  logItems = []
  permissions = []
})

/** Opens a row's actions menu and picks `item` from it. */
async function pick(user: ReturnType<typeof userEvent.setup>, name: string, item: string) {
  await user.click(within(rowWith(name)).getByRole('button', { name: 'Row actions' }))
  await user.click(await screen.findByRole('menuitem', { name: item }))
}

function record(overrides: Partial<VerificationRecord>): VerificationRecord {
  return {
    id: 'v1',
    kind: 'background',
    name: 'Kevin Ragira',
    dateOfBirth: '1987-11-11',
    status: 'clear',
    recordsFound: false,
    hasReport: false,
    completedAt: '2026-09-30T14:31:00Z',
    createdAt: '2026-09-30T14:30:00Z',
    ...overrides,
  }
}

/** The table row naming `text`, to read its cells. */
function rowWith(text: string) {
  return screen.getByText(text).closest('tr') as HTMLElement
}

describe('the verification form', () => {
  it('opens on the background check, asking for the address it can use', () => {
    render(<VerificationPage />)

    expect(screen.getByRole('radio', { name: /Background check/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Street')).toBeInTheDocument()
    expect(screen.queryByText('Insurance cover needed')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run background check' })).toBeInTheDocument()
  })

  it('asks only for what the insurance check needs once it is picked', async () => {
    // The address narrows a criminal search; it has no bearing on cover, so it is not asked for.
    const user = userEvent.setup()
    render(<VerificationPage />)

    await user.click(screen.getByRole('radio', { name: /Insurance/ }))

    expect(screen.queryByLabelText('Street')).not.toBeInTheDocument()
    // Nor dates: the check answers for the person, to their policy's expiry, not for a rental.
    expect(screen.queryByText('Insurance cover needed')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Run background check' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create insurance link' })).toBeInTheDocument()
  })

  it('runs the picked check when Enter submits the form, not always the background one', async () => {
    const user = userEvent.setup()
    render(<VerificationPage />)

    await user.click(screen.getByRole('radio', { name: /Insurance/ }))
    await fillPerson(user)
    await user.type(screen.getByLabelText(/Full name/), '{Enter}')

    await vi.waitFor(() => expect(share).toHaveBeenCalledOnce())
    expect(share.mock.calls[0][0]).toMatchObject({ name: 'Jordan Reyes', dateOfBirth: '1990-06-01' })
    expect(share.mock.calls[0][0]).not.toHaveProperty('coversFrom')
    expect(orderMutate).not.toHaveBeenCalled()
  })

  it('still runs the background check from its own button', async () => {
    const user = userEvent.setup()
    render(<VerificationPage />)

    await fillPerson(user)
    await user.click(screen.getByRole('button', { name: 'Run background check' }))

    await vi.waitFor(() => expect(orderMutate).toHaveBeenCalledOnce())
    expect(share).not.toHaveBeenCalled()
  })
})

describe('the verification history', () => {
  it('shows who was checked without their date of birth', () => {
    logItems = [record({ email: 'kevin@example.com', customerId: 'c1' })]
    render(<VerificationPage />)

    const row = rowWith('Kevin Ragira')
    expect(within(row).getByText('kevin@example.com')).toBeInTheDocument()
    expect(within(row).queryByText(/Nov 11/)).not.toBeInTheDocument()
  })

  it('names each result in the check’s own words', () => {
    logItems = [
      record({ id: 'v1', kind: 'insurance', name: 'John Smith', status: 'clear' }),
      record({ id: 'v2', kind: 'insurance', name: 'Kevin Ragira', status: 'consider' }),
    ]
    render(<VerificationPage />)

    expect(within(rowWith('John Smith')).getByText('Covered')).toBeInTheDocument()
    expect(within(rowWith('Kevin Ragira')).getByText('Needs review')).toBeInTheDocument()
  })

  it('says a check still running is in progress, and since when', () => {
    logItems = [record({ kind: 'insurance', status: 'running', completedAt: undefined })]
    render(<VerificationPage />)

    const row = rowWith('Kevin Ragira')
    expect(within(row).getByText('In progress')).toBeInTheDocument()
    expect(within(row).getByText('Started Sep 30')).toBeInTheDocument()
  })

  it('opens a report from the row menu, and shows no menu where there is nothing to do', async () => {
    const user = userEvent.setup()
    logItems = [
      record({ id: 'v1', name: 'Kevin Ragira', hasReport: true }),
      record({ id: 'v2', kind: 'insurance', name: 'John Smith' }),
    ]
    render(<VerificationPage />)

    await pick(user, 'Kevin Ragira', 'View report')

    expect(openReport).toHaveBeenCalledWith('v1')
    expect(within(rowWith('John Smith')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('sends a new insurance link back through the booking it was for', async () => {
    const user = userEvent.setup()
    logItems = [record({ kind: 'insurance', status: 'consider', bookingReference: 'BK-10001' })]
    render(<VerificationPage />)

    await pick(user, 'Kevin Ragira', 'Send new link')

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ reference: 'BK-10001' }))
  })

  it('deletes a finished check only once the manager confirms', async () => {
    const user = userEvent.setup()
    permissions = ['verifications.delete']
    logItems = [record({ id: 'v7' })]
    render(<VerificationPage />)

    await pick(user, 'Kevin Ragira', 'Delete')
    expect(removeCheck).not.toHaveBeenCalled()
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(removeCheck).toHaveBeenCalledWith('v7', expect.anything())
  })

  it('offers counter staff no delete', () => {
    logItems = [record({})]
    render(<VerificationPage />)

    expect(within(rowWith('Kevin Ragira')).queryByRole('button')).not.toBeInTheDocument()
  })
})
