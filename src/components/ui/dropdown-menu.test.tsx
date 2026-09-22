import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

/**
 * Radix restores focus to the trigger when a menu closes, and browsers treat programmatic
 * `.focus()` as keyboard-initiated — so a mouse dismissal used to leave a focus ring behind.
 * `data-silent-focus` is what tells CSS to skip the ring for that one restore.
 *
 * These assert the attribute rather than the ring: jsdom accepts `:focus-visible` but always
 * reports false, so a test written against the ring itself would pass either way.
 */
function Menu() {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="Open menu">Menu</DropdownMenuTrigger>
        <DropdownMenuContent data-testid="menu">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem disabled>Archived</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <button type="button">Outside</button>
    </>
  )
}

const trigger = () => screen.getByRole('button', { name: 'Open menu' })

/**
 * Radix sets `pointer-events: none` outside an open menu, which userEvent will not click
 * through, so the dismiss event is dispatched the way its own layer listens for it.
 */
async function clickOutside() {
  await act(async () => {
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }),
    )
  })
}

describe('DropdownMenu focus restore', () => {
  it('marks the trigger when the menu is dismissed by clicking away', async () => {
    const user = userEvent.setup()
    render(<Menu />)

    await user.click(trigger())
    await clickOutside()

    // Focus still returns — keyboard and screen-reader users depend on it.
    await waitFor(() => expect(trigger()).toHaveFocus())
    expect(trigger()).toHaveAttribute('data-silent-focus')
  })

  it('marks the trigger when a menu item is clicked', async () => {
    const user = userEvent.setup()
    render(<Menu />)

    await user.click(trigger())
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))

    await waitFor(() => expect(trigger()).toHaveAttribute('data-silent-focus'))
  })

  it('leaves the trigger unmarked when dismissed with Escape', async () => {
    const user = userEvent.setup()
    render(<Menu />)

    await user.click(trigger())
    await user.keyboard('{Escape}')

    // A keyboard user needs to see where focus landed.
    await waitFor(() => expect(trigger()).toHaveFocus())
    expect(trigger()).not.toHaveAttribute('data-silent-focus')
  })

  it('clears the mark on the next key press, so later keyboard focus still rings', async () => {
    const user = userEvent.setup()
    render(<Menu />)

    await user.click(trigger())
    await clickOutside()
    await waitFor(() => expect(trigger()).toHaveAttribute('data-silent-focus'))

    await user.keyboard('{Tab}')

    expect(trigger()).not.toHaveAttribute('data-silent-focus')
  })

  it('clears the mark once focus leaves the trigger', async () => {
    const user = userEvent.setup()
    render(<Menu />)

    await user.click(trigger())
    await clickOutside()
    await waitFor(() => expect(trigger()).toHaveAttribute('data-silent-focus'))

    screen.getByRole('button', { name: 'Outside' }).focus()

    expect(trigger()).not.toHaveAttribute('data-silent-focus')
  })
})

/**
 * The attribute only suppresses the ring because a rule in globals.css acts on it. Removing
 * that rule would bring the bug back without failing any of the tests above.
 */
describe('the CSS that acts on the mark', () => {
  it('leaves the trigger unmarked when a press on the menu padding is followed by Escape', async () => {
    const user = userEvent.setup()
    render(<Menu />)

    await user.click(trigger())
    // Pressing the padding does not close the menu, so it must not count as a dismissal.
    await act(async () => {
      screen
        .getByTestId('menu')
        .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))
    })
    await user.keyboard('{Escape}')

    await waitFor(() => expect(trigger()).toHaveFocus())
    expect(trigger()).not.toHaveAttribute('data-silent-focus')
  })

  it('leaves the trigger unmarked when a press on a disabled item is followed by Escape', async () => {
    const user = userEvent.setup()
    render(<Menu />)

    await user.click(trigger())
    await act(async () => {
      screen
        .getByRole('menuitem', { name: 'Archived' })
        .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))
    })
    await user.keyboard('{Escape}')

    await waitFor(() => expect(trigger()).toHaveFocus())
    expect(trigger()).not.toHaveAttribute('data-silent-focus')
  })

  it('still marks the trigger when an enabled item is clicked after pressing the padding', async () => {
    const user = userEvent.setup()
    render(<Menu />)

    await user.click(trigger())
    await act(async () => {
      screen
        .getByTestId('menu')
        .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))
    })
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))

    await waitFor(() => expect(trigger()).toHaveAttribute('data-silent-focus'))
  })

  it('still has a rule for data-silent-focus', async () => {
    const css = await import('@/styles/globals.css?raw')

    expect(css.default).toContain('[data-silent-focus]:focus-visible')
  })
})
