import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom implements neither the Pointer Capture API nor scrollIntoView, both of
// which Radix's Select reaches for as soon as its trigger is clicked.
Object.assign(window.HTMLElement.prototype, {
  hasPointerCapture: vi.fn(() => false),
  setPointerCapture: vi.fn(),
  releasePointerCapture: vi.fn(),
  scrollIntoView: vi.fn(),
})

// Radix measures its thumb with ResizeObserver, which jsdom does not implement. The switch
// renders from props, so a no-op observer is enough for it to mount.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
