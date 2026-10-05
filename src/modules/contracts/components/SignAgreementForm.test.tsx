import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ApiError } from '@/types/api'
import type { SignatureInput } from '../types/booking-contract.types'
import { SignAgreementForm } from './SignAgreementForm'

const DRAWING = 'data:image/png;base64,AAAA'
const LONGER = 'data:image/png;base64,AAAABBBB'
const UNREADABLE = new ApiError('validation', 'no', { status: 422, code: 'signature_invalid' })
const REFUSAL = "We couldn't read that signature. Clear it and try again."

// jsdom has no canvas; buttons stand in for a first stroke on the pad, and for one more.
vi.mock('./SignaturePad', () => ({
  SignaturePad: ({ onChange }: { onChange: (drawing: string | undefined) => void }) => (
    <>
      <button type="button" onClick={() => onChange(DRAWING)}>
        draw
      </button>
      <button type="button" onClick={() => onChange(LONGER)}>
        draw more
      </button>
    </>
  ),
}))

function renderForm(error: unknown = null) {
  const onSubmit = vi.fn<(input: SignatureInput) => void>()
  render(<SignAgreementForm defaultName="Marisol Vega" submitting={false} error={error} onSubmit={onSubmit} />)
  return onSubmit
}

/** The form as its page holds it: an attempt goes out, and its failure comes back as a prop. */
function renderAttempt() {
  const form = (error: unknown, submitting = false) => (
    <SignAgreementForm defaultName="Marisol Vega" submitting={submitting} error={error} onSubmit={vi.fn()} />
  )
  const { rerender, unmount } = render(form(null))
  return {
    unmount,
    sending: () => rerender(form(null, true)),
    refuse: (error: unknown) => rerender(form(error)),
  }
}

async function signWithDrawing(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'draw' }))
  await user.click(consent())
  await user.click(submit())
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
    const { refuse, unmount } = renderAttempt()

    await signWithDrawing(user)
    refuse(UNREADABLE)
    expect(screen.getByText(REFUSAL)).toBeInTheDocument()
    unmount()

    renderForm(new ApiError('conflict', 'The booking is cancelled', { status: 409, code: 'booking_cancelled' }))
    expect(screen.getByText(/We couldn't record the signature.*The booking is cancelled/)).toBeInTheDocument()
  })

  it('drops a refusal of the drawing once the renter signs another way', async () => {
    const user = userEvent.setup({ delay: null })
    const { refuse } = renderAttempt()
    const typed = screen.getByRole('checkbox', { name: 'Use my typed name as my signature instead' })

    await signWithDrawing(user)
    refuse(UNREADABLE)
    expect(screen.getByText(REFUSAL)).toBeInTheDocument()

    await user.click(typed)
    expect(screen.getByText('Your typed name will be recorded as your signature.')).toBeInTheDocument()
    expect(screen.queryByText(REFUSAL)).not.toBeInTheDocument()

    // Back to an empty pad: the drawing that was refused is gone, and so is its refusal.
    await user.click(typed)
    expect(screen.queryByText(REFUSAL)).not.toBeInTheDocument()
  })

  it('still says why signing failed when the renter drew on while it was being sent', async () => {
    const user = userEvent.setup({ delay: null })
    const { sending, refuse } = renderAttempt()

    await signWithDrawing(user)
    sending()
    await user.click(screen.getByRole('button', { name: 'draw more' }))
    refuse(UNREADABLE)
    // The pad no longer holds what was sent, but the renter has not seen this refusal yet.
    expect(screen.getByText(REFUSAL)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'draw' }))
    expect(screen.queryByText(REFUSAL)).not.toBeInTheDocument()
  })

  it("does not greet a reopened form with the last one's refusal", () => {
    // The counter's dialog keeps its last error while closed; the pad it reopens with is empty.
    renderForm(UNREADABLE)

    expect(screen.queryByText(REFUSAL)).not.toBeInTheDocument()
  })
})
