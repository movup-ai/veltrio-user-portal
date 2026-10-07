import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { HandoverInput } from '../types/booking.types'
import { BookingConditionDialog } from './BookingConditionDialog'

const onSubmit = vi.fn<(input: HandoverInput) => void>()

vi.mock('@/components/ui/use-toast', () => ({ toast: vi.fn() }))

type Props = Partial<React.ComponentProps<typeof BookingConditionDialog>>

function dialog(props: Props) {
  return (
    <BookingConditionDialog
      open
      onOpenChange={() => {}}
      stage="pickup"
      loading={false}
      onSubmit={onSubmit}
      {...props}
    />
  )
}

function renderDialog(props: Props) {
  render(dialog(props))
  return userEvent.setup({ delay: null })
}

const odometer = () => screen.getByRole('textbox', { name: /Odometer/ })
const photoInput = () => document.querySelector('input[type="file"]') as HTMLInputElement
const jpeg = (name: string) => new File(['photo'], name, { type: 'image/jpeg' })

/** One tap on the gauge, which is a row of radios from Empty to Full. */
async function chooseFuel(user: ReturnType<typeof userEvent.setup>, level: string) {
  await user.click(
    within(screen.getByRole('radiogroup', { name: 'Fuel level' })).getByRole('radio', { name: level }),
  )
}

describe('BookingConditionDialog', () => {
  beforeEach(() => {
    onSubmit.mockReset()
    // jsdom has neither; the form previews a picked photo from the file itself.
    URL.createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`)
    URL.revokeObjectURL = vi.fn()
  })

  it('starts a pickup from the mileage on file and will not hand over without a fuel level', async () => {
    const user = renderDialog({ vehicleMileage: 12000 })
    expect(odometer()).toHaveValue('12000')

    await user.click(screen.getByRole('button', { name: 'Hand over vehicle' }))

    expect(screen.getByText('Choose the fuel level.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('sends what was read at pickup, and nothing a pickup does not take', async () => {
    const user = renderDialog({ vehicleMileage: 12000 })

    await user.clear(odometer())
    await user.type(odometer(), '12,480')
    await chooseFuel(user, '3/4')
    await user.click(screen.getByRole('textbox', { name: /Marks and damage/ }))
    await user.paste('Scuff on the rear bumper')
    await user.click(screen.getByRole('button', { name: 'Hand over vehicle' }))

    // Exactly this: the pickup endpoint refuses a field it does not know, such as sendToService.
    expect(onSubmit).toHaveBeenCalledWith({
      odometer: 12480,
      fuelLevel: 6,
      notes: 'Scuff on the rear bumper',
      photos: [],
    })
  })

  it('warns, without calling it an error, when a pickup reads below the mileage on file', async () => {
    const user = renderDialog({ vehicleMileage: 12000 })

    await user.clear(odometer())
    await user.type(odometer(), '1200')
    await user.click(screen.getByRole('button', { name: 'Hand over vehicle' }))

    expect(screen.getByText(/Lower than the 12,000 mi on the vehicle's file/)).toBeInTheDocument()
    expect(odometer()).not.toHaveAttribute('aria-invalid')
  })

  const RETURN = {
    stage: 'return',
    pickup: { odometer: 12480, fuelLevel: 6 },
    // A return is read off the car: the file's figure must not be offered as the answer.
    vehicleMileage: 12480,
  } as const

  it('refuses a return whose odometer went backwards', async () => {
    const user = renderDialog(RETURN)
    expect(odometer()).toHaveValue('')
    expect(screen.getByText('At pickup: 12,480 mi')).toBeInTheDocument()
    expect(screen.getByText('At pickup: 3/4')).toBeInTheDocument()

    await user.type(odometer(), '12400')
    await chooseFuel(user, '1/2')
    await user.click(screen.getByRole('button', { name: 'Return vehicle' }))

    expect(screen.getByText('That is less than the 12,480 mi read at pickup.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('sends a return with where the car goes next', async () => {
    const user = renderDialog(RETURN)

    await user.type(odometer(), '13120')
    await chooseFuel(user, '1/2')

    await user.click(screen.getByRole('radio', { name: 'Send to maintenance' }))
    await user.click(screen.getByRole('button', { name: 'Return vehicle' }))

    expect(onSubmit).toHaveBeenCalledWith({
      odometer: 13120,
      fuelLevel: 4,
      notes: '',
      photos: [],
      sendToService: true,
    })
  })

  it('reads an electric car for charge, on the same scale', async () => {
    const user = renderDialog({ electric: true, vehicleMileage: 12000 })

    await user.click(screen.getByRole('button', { name: 'Hand over vehicle' }))
    expect(screen.getByText('Choose the charge level.')).toBeInTheDocument()

    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Charge level' })).getByRole('radio', { name: '3/4' }),
    )
    await user.click(screen.getByRole('button', { name: 'Hand over vehicle' }))

    expect(onSubmit).toHaveBeenCalledWith({ odometer: 12000, fuelLevel: 6, notes: '', photos: [] })
  })

  it('keeps picked photos in the form and hands over only those still there', async () => {
    const user = renderDialog({ vehicleMileage: 12000 })

    await user.upload(photoInput(), [jpeg('front.jpg'), jpeg('rear.jpg')])

    // Previewed from the file itself: nothing has been sent anywhere for there to be a link to.
    expect(screen.getByRole('link', { name: 'Open front.jpg' })).toHaveAttribute('href', 'blob:front.jpg')
    await user.click(screen.getByRole('button', { name: 'Remove front.jpg' }))
    expect(screen.queryByRole('link', { name: 'Open front.jpg' })).not.toBeInTheDocument()

    await chooseFuel(user, 'Full')
    await user.click(screen.getByRole('button', { name: 'Hand over vehicle' }))

    const sent = onSubmit.mock.calls[0][0].photos
    expect(sent.map((file) => file.name)).toEqual(['rear.jpg'])
  })

  it('starts empty each time it is opened, so a cancelled form leaves nothing behind', async () => {
    const { rerender } = render(dialog({}))
    const user = userEvent.setup({ delay: null })
    await user.upload(photoInput(), jpeg('front.jpg'))
    await user.type(odometer(), '12480')

    rerender(dialog({ open: false }))
    rerender(dialog({ open: true }))

    expect(odometer()).toHaveValue('')
    expect(screen.queryByRole('link', { name: 'Open front.jpg' })).not.toBeInTheDocument()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:front.jpg')
  })
})
