import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ApiError } from '@/types/api'
import type { SignatureInput } from '../types/booking-contract.types'
import { SignAgreementForm } from './SignAgreementForm'

const DRAWING = 'data:image/png;base64,AAAA'

// jsdom has no canvas; a button stands in for drawing a stroke on the pad.
vi.mock('./SignaturePad', () => ({
  SignaturePad: ({ onChange }: { onChange: (drawing: string | undefined) => void }) => (
    <button type="button" onClick={() => onChange(DRAWING)}>
      draw
    </button>
  ),
}))

function renderForm(error: unknown = null) {
  const onSubmit = vi.fn<(input: SignatureInput) => void>()
  render(<SignAgreementForm defaultName="Marisol Vega" submitting={false} error={error} onSubmit={onSubmit} />)
  return onSubmit
}

const consent = () => screen.getByRole('checkbox', { name: /I have read this rental agreement/ })
const submit = () => screen.getByRole('button', { name: 'Sign agreement' })

describe('SignAgreementForm', () => {
  it('sends nothing until there is consent and a signature, and says what is missing', async () => {
    const user = userEvent.setup({ delay: null })
    const onSubmit = renderForm()

    await user.click(submit())

    expect(screen.getByText('Draw your signature, or choose to use your typed name.')).toBeInTheDocument()
    expect(screen.getByText('Tick the box to confirm you agree before signing.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('signs with the drawing and the name as the renter corrected it', async () => {
    const user = userEvent.setup({ delay: null })
    const onSubmit = renderForm()

    const name = screen.getByLabelText(/Full name/)
    expect(name).toHaveValue('Marisol Vega')
    await user.type(name, ' Ortiz')
    await user.click(screen.getByRole('button', { name: 'draw' }))
    await user.click(consent())
    await user.click(submit())

    expect(onSubmit).toHaveBeenCalledWith({ signerName: 'Marisol Vega Ortiz', signature: DRAWING })
  })

  it('sends no drawing when the renter adopts their typed name instead', async () => {
    const user = userEvent.setup({ delay: null })
    const onSubmit = renderForm()

    await user.click(screen.getByRole('button', { name: 'draw' }))
    await user.click(screen.getByRole('checkbox', { name: 'Use my typed name as my signature instead' }))
    await user.click(consent())
    await user.click(submit())

    expect(screen.getByText('Your typed name will be recorded as your signature.')).toBeInTheDocument()
    expect(onSubmit).toHaveBeenCalledWith({ signerName: 'Marisol Vega', signature: undefined })
  })

  it("shows the API's refusal of a drawing under the pad, and anything else beside the button", async () => {
    const user = userEvent.setup({ delay: null })
    const { unmount } = render(
      <SignAgreementForm
        defaultName="Marisol Vega"
        submitting={false}
        error={new ApiError('validation', 'no', { status: 422, code: 'signature_invalid' })}
        onSubmit={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'draw' }))
    await user.click(consent())
    await user.click(submit())
    expect(screen.getByText("We couldn't read that signature. Clear it and try again.")).toBeInTheDocument()
    unmount()

    renderForm(new ApiError('conflict', 'The booking is cancelled', { status: 409, code: 'booking_cancelled' }))
    expect(screen.getByText(/We couldn't record the signature.*The booking is cancelled/)).toBeInTheDocument()
  })

  it('drops a refusal of the drawing once the renter signs another way', async () => {
    const user = userEvent.setup({ delay: null })
    const refusal = "We couldn't read that signature. Clear it and try again."
    renderForm(new ApiError('validation', 'no', { status: 422, code: 'signature_invalid' }))
    const typed = screen.getByRole('checkbox', { name: 'Use my typed name as my signature instead' })

    // Before anything is sent from this form, the refusal is of an earlier attempt's drawing.
    expect(screen.queryByText(refusal)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'draw' }))
    await user.click(consent())
    await user.click(submit())
    expect(screen.getByText(refusal)).toBeInTheDocument()

    await user.click(typed)
    expect(screen.getByText('Your typed name will be recorded as your signature.')).toBeInTheDocument()
    expect(screen.queryByText(refusal)).not.toBeInTheDocument()

    // Back to an empty pad: the drawing that was refused is gone, and so is its refusal.
    await user.click(typed)
    expect(screen.queryByText(refusal)).not.toBeInTheDocument()
  })
})
