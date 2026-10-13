/** Kept clear above and below a dialog that is held in place. */
const MARGIN_PX = 16

/**
 * Holds a dialog where it stands, for use as the `ref` of the content inside it. Centred by CSS
 * alone, a dialog re-centres whenever a line is added or taken away, and the fields jump under
 * the cursor. Held, it stays centred as it opened and grows downward from there.
 */
export function holdDialogInPlace(content: HTMLElement | null) {
  const dialog = content?.closest<HTMLElement>('[role="dialog"]')
  if (!dialog) return
  // The same spot centring gives, as a fixed distance instead of half of a height that changes.
  const centre = () => Math.max((window.innerHeight - dialog.offsetHeight) / 2, MARGIN_PX)
  let opened = centre()
  dialog.style.translate = '-50% 0'
  dialog.style.maxHeight = `calc(100vh - ${2 * MARGIN_PX}px)`

  // Grown past the foot of the window, it moves up only as far as it must to stay on screen.
  const place = () => {
    const lowest = window.innerHeight - MARGIN_PX - dialog.offsetHeight
    dialog.style.top = `${Math.max(Math.min(opened, lowest), MARGIN_PX)}px`
  }
  const recentre = () => {
    opened = centre()
    place()
  }
  place()

  const grown = new ResizeObserver(place)
  grown.observe(dialog)
  window.addEventListener('resize', recentre)
  return () => {
    grown.disconnect()
    window.removeEventListener('resize', recentre)
  }
}
