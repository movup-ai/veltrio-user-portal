import { afterEach, describe, expect, it, vi } from 'vitest'
import { holdDialogInPlace } from './dialog-hold'

/** Stands in for the browser telling the dialog it changed height. */
let resized: () => void = () => {}

/** A dialog of a given height with a form inside it, in a window 800 tall. */
function dialogOf(height: number) {
  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  const form = dialog.appendChild(document.createElement('form'))
  document.body.appendChild(dialog)
  const grow = (to: number) =>
    Object.defineProperty(dialog, 'offsetHeight', { value: to, configurable: true })
  grow(height)
  vi.stubGlobal('innerHeight', 800)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resized = callback
      }
      observe() {}
      disconnect() {}
    },
  )
  return { dialog, form, grow }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('holdDialogInPlace', () => {
  it('fixes the dialog where centring put it, no longer pulled up by half its own height', () => {
    const { dialog, form } = dialogOf(600)

    holdDialogInPlace(form)

    expect(dialog.style.top).toBe('100px')
    expect(dialog.style.translate).toBe('-50% 0')
  })

  it('stays put when a line is added below, where centring would have moved it up', () => {
    const { dialog, form, grow } = dialogOf(600)
    holdDialogInPlace(form)

    grow(660)
    resized()

    expect(dialog.style.top).toBe('100px')
  })

  it('moves up only as far as it must once it would run off the foot of the window', () => {
    const { dialog, form, grow } = dialogOf(600)
    holdDialogInPlace(form)

    // 100 + 720 would end 20 past the window, less the margin kept clear below.
    grow(720)
    resized()
    expect(dialog.style.top).toBe('64px')

    // Back to its size, back to where it opened.
    grow(600)
    resized()
    expect(dialog.style.top).toBe('100px')
  })

  it('never starts above the window, and scrolls inside itself past its height', () => {
    const { dialog, form } = dialogOf(900)

    holdDialogInPlace(form)

    expect(dialog.style.top).toBe('16px')
    expect(dialog.style.maxHeight).toBe('calc(100vh - 32px)')
  })

  it('centres again when the window itself is resized', () => {
    const { dialog, form } = dialogOf(600)
    holdDialogInPlace(form)

    vi.stubGlobal('innerHeight', 1000)
    window.dispatchEvent(new Event('resize'))

    expect(dialog.style.top).toBe('200px')
  })

  it('stops watching once the content is gone, and does nothing outside a dialog', () => {
    const { dialog, form } = dialogOf(600)
    const release = holdDialogInPlace(form)

    release?.()
    vi.stubGlobal('innerHeight', 1000)
    window.dispatchEvent(new Event('resize'))

    expect(dialog.style.top).toBe('100px')
    expect(holdDialogInPlace(null)).toBeUndefined()
    expect(holdDialogInPlace(document.createElement('form'))).toBeUndefined()
  })
})
