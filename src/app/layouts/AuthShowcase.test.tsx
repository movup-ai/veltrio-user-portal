import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { SITE_DOMAIN } from '@/modules/vehicles/utils/public-links'
import { useSitePreviewStore } from '@/state/site-preview.store'
import { AuthShowcase } from './AuthShowcase'

// Before React loads: without AnimationEvent it listens for webkitAnimationEnd, never animationend.
vi.hoisted(() => {
  if (!('AnimationEvent' in window)) Object.assign(window, { AnimationEvent: class extends Event {} })
})

let reducedMotion = false

const current = () =>
  screen
    .getAllByRole('button', { name: /^Show:/ })
    .findIndex((dot) => dot.getAttribute('aria-current') === 'true')
const progress = () => screen.getByTestId('showcase-progress')

// Embla reads both on start; jsdom has neither.
beforeEach(() => {
  reducedMotion = false
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: media.includes('reduce') && reducedMotion,
    media,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    },
  )
  useSitePreviewStore.setState({ subdomain: '' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function renderShowcase(step?: Parameters<typeof AuthShowcase>[0]['step']) {
  const view = render(<AuthShowcase step={step} />)
  await act(async () => {})
  return view
}

describe('AuthShowcase on sign-in and sign-up', () => {
  it('moves on to the next essential when the current one’s time is up', async () => {
    await renderShowcase()
    expect(current()).toBe(0)

    await act(async () => fireEvent.animationEnd(progress()))

    expect(current()).toBe(1)
  })

  it('holds while the pointer is over it, and runs again once it leaves', async () => {
    await renderShowcase('account')
    expect(progress()).toHaveStyle({ animationPlayState: 'running' })

    fireEvent.pointerEnter(screen.getByRole('region'))
    expect(progress()).toHaveStyle({ animationPlayState: 'paused' })

    fireEvent.pointerLeave(screen.getByRole('region'))
    expect(progress()).toHaveStyle({ animationPlayState: 'running' })
  })

  it('holds while the tab is in the background', async () => {
    await renderShowcase()
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)

    await act(async () => document.dispatchEvent(new Event('visibilitychange')))

    expect(progress()).toHaveStyle({ animationPlayState: 'paused' })
    hidden.mockRestore()
  })

  it('leaves the rotating essentials unlabelled: each has its own headline', async () => {
    await renderShowcase()

    expect(screen.queryByText('Fleet card')).not.toBeInTheDocument()
  })

  it('does not move by itself for someone who asked for less motion', async () => {
    reducedMotion = true
    await renderShowcase()

    expect(progress().style.animationName).toBe('')
  })
})

describe('AuthShowcase on an onboarding step', () => {
  it('shows the step’s scene still, with nothing to page through', async () => {
    await renderShowcase('plan')

    expect(screen.getByText('Your fleet, calendar and renter checks')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('showcase-progress')).not.toBeInTheDocument()
  })

  it('names each close-up of a step, so they read as parts rather than one picture', async () => {
    await renderShowcase('plan')

    expect(screen.getByText('Renter checks')).toBeInTheDocument()
    expect(screen.getByText('Fleet calendar')).toBeInTheDocument()
  })

  it('swaps to the next step’s scene when the step changes', async () => {
    const { rerender } = await renderShowcase('company')

    rerender(<AuthShowcase step="ready" />)

    expect(screen.getByText('Ready before the keys go out')).toBeInTheDocument()
    expect(screen.queryByText('Your booking site, at your own URL')).not.toBeInTheDocument()
  })

  it('previews the Company URL being typed in the site’s address bar', async () => {
    await renderShowcase('company')
    expect(screen.getByTestId('showcase-url')).toHaveTextContent(`your-company.${SITE_DOMAIN}`)

    act(() => useSitePreviewStore.getState().setSubdomain('miami-exotics'))

    expect(screen.getByTestId('showcase-url')).toHaveTextContent(`miami-exotics.${SITE_DOMAIN}`)
  })
})
