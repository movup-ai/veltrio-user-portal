import { describe, expect, it } from 'vitest'
import type { Setup, SetupStep } from '../types/setup.types'
import {
  hasSetup,
  progressSegments,
  setupIsWholePage,
  setupProgress,
  showSetupCard,
  showSetupReopen,
} from './setup.utils'

const steps = (...statuses: SetupStep['status'][]): SetupStep[] =>
  (['vehicle', 'branch', 'payments'] as const)
    .slice(0, statuses.length)
    .map((key, i) => ({ key, status: statuses[i] }))

const setup = (statuses: SetupStep['status'][], dismissed = false): Setup => ({
  steps: steps(...statuses),
  dismissed,
})

describe('hasSetup', () => {
  it('is for owners and managers, whom the API answers', () => {
    expect(hasSetup('owner')).toBe(true)
    expect(hasSetup('manager')).toBe(true)
    expect(hasSetup('staff')).toBe(false)
    expect(hasSetup(undefined)).toBe(false)
  })
})

describe('setupProgress', () => {
  it('counts a step Stripe is still reviewing as not done', () => {
    expect(setupProgress(steps('done', 'todo', 'pending'))).toEqual({ done: 1, total: 3 })
  })
})

describe('showSetupCard', () => {
  it('shows while a step is left, until it is put away', () => {
    expect(showSetupCard(setup(['done', 'todo']))).toBe(true)
    expect(showSetupCard(setup(['done', 'todo'], true))).toBe(false)
  })

  it('stays while Stripe is reviewing the account', () => {
    expect(showSetupCard(setup(['done', 'pending']))).toBe(true)
  })

  it('goes once every step is done', () => {
    expect(showSetupCard(setup(['done', 'done']))).toBe(false)
  })
})

describe('showSetupReopen', () => {
  it('offers an owner the checklist they put away before finishing it', () => {
    expect(showSetupReopen(setup(['todo'], true), 'owner')).toBe(true)
  })

  it('is not offered while the card is out, once all is done, or to a manager', () => {
    expect(showSetupReopen(setup(['todo']), 'owner')).toBe(false)
    expect(showSetupReopen(setup(['done'], true), 'owner')).toBe(false)
    expect(showSetupReopen(setup(['todo'], true), 'manager')).toBe(false)
  })
})

describe('progressSegments', () => {
  it('fills from the left whichever steps were finished, Stripe in review next', () => {
    expect(progressSegments(steps('todo', 'pending', 'done'))).toEqual(['done', 'pending', 'todo'])
  })
})

describe('setupIsWholePage', () => {
  const owner = (booking: SetupStep['status'], dismissed = false): Setup => ({
    steps: [
      { key: 'payments', status: 'pending' },
      { key: 'booking', status: booking },
    ],
    dismissed,
  })

  it('is the whole page until the first booking, Stripe or not', () => {
    expect(setupIsWholePage(owner('todo'))).toBe(true)
    expect(setupIsWholePage(owner('done'))).toBe(false)
  })

  it('is not the page once put away', () => {
    expect(setupIsWholePage(owner('todo', true))).toBe(false)
  })

  it("holds a manager's dashboard only while their vehicle step is left", () => {
    expect(setupIsWholePage(setup(['todo']))).toBe(true)
    expect(setupIsWholePage(setup(['done']))).toBe(false)
  })
})
