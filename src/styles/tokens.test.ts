import { describe, expect, it } from 'vitest'
import tokens from './tokens.css?raw'

type Theme = Record<string, string>

function declared(selector: ':root' | '.dark'): Theme {
  const block = tokens.split(`${selector} {`)[1].split('\n}')[0]
  return Object.fromEntries(
    [...block.matchAll(/--veltrio-([\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2]]),
  )
}

const LIGHT = declared(':root')
// The dark block only overrides: anything it leaves out is the light value.
const DARK = { ...LIGHT, ...declared('.dark') }

/** Red, green and blue of a `#rrggbb` or `rgb(a)` colour, each from 0 to 1. */
function channels(colour: string): number[] {
  const hex = /^#([0-9a-f]{6})$/i.exec(colour)
  if (hex) return [0, 2, 4].map((at) => parseInt(hex[1].slice(at, at + 2), 16) / 255)
  const rgb = /^rgba?\(([^)]+)\)$/.exec(colour)
  if (!rgb) throw new Error(`not a colour: ${colour}`)
  return rgb[1]
    .split(',')
    .slice(0, 3)
    .map((part) => Number(part) / 255)
}

function luminance(colour: string): number {
  const [r, g, b] = channels(colour).map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

describe.each([
  ['light', LIGHT],
  ['dark', DARK],
])('%s theme', (_name, theme) => {
  it.each(['primary-solid', 'primary-solid-hover', 'error-solid'])(
    'keeps the label of a filled button readable on %s',
    (fill) => {
      // 4.5:1 is the WCAG AA floor for text the size of a button label.
      expect(contrast(theme[fill], theme['solid-foreground'])).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('dims the page behind a dialog, rather than washing it out', () => {
    expect(luminance(theme.scrim)).toBeLessThan(0.05)
  })
})
