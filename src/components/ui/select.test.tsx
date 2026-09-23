import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

/**
 * Same restore problem the dropdown menu has: Radix returns focus to the trigger on close, and
 * browsers treat a programmatic `.focus()` as keyboard-initiated, so picking an option with the
 * mouse left a focus ring behind. `data-silent-focus` tells CSS to skip the ring for that one
 * restore.
 *
 * These assert the attribute rather than the ring: jsdom accepts `:focus-visible` but always
 * reports false, so a test written against the ring would pass either way.
 */
function Picker() {
  return (
    <>
      <Select defaultValue="10">
        <SelectTrigger aria-label="Rows per page">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="10">10</SelectItem>
          <SelectItem value="25">25</SelectItem>
        </SelectContent>
      </Select>
      <button type="button">Outside</button>
    </>
  )
}

const trigger = () => screen.getByRole('combobox', { name: 'Rows per page' })

/** Radix blocks pointer events outside an open popover, so dismiss it the way its layer listens. */
async function clickOutside() {
  await act(async () => {
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }),
    )
  })
}

describe('Select focus restore', () => {
  it('marks the trigger when the list is dismissed by clicking away', async () => {
    const user = userEvent.setup()
    render(<Picker />)

    await user.click(trigger())
    await clickOutside()

    // Focus still returns — keyboard and screen-reader users depend on it.
    await waitFor(() => expect(trigger()).toHaveFocus())
    expect(trigger()).toHaveAttribute('data-silent-focus')
  })

  it('leaves the ring alone when the list is dismissed by keyboard', async () => {
    const user = userEvent.setup()
    render(<Picker />)

    await user.click(trigger())
    await user.keyboard('{Escape}')

    await waitFor(() => expect(trigger()).toHaveFocus())
    expect(trigger()).not.toHaveAttribute('data-silent-focus')
  })

  it('clears the mark on the next key press, so a later keyboard focus still rings', async () => {
    const user = userEvent.setup()
    render(<Picker />)

    await user.click(trigger())
    await clickOutside()
    await waitFor(() => expect(trigger()).toHaveAttribute('data-silent-focus'))

    await user.keyboard('{Tab}')
    expect(trigger()).not.toHaveAttribute('data-silent-focus')
  })
})
