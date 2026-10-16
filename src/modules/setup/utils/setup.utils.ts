import type { MembershipRole } from '@/types/user'
import type { Setup, SetupStep, SetupStepStatus } from '../types/setup.types'

/** The API answers owners and managers; staff get a 403. */
export function hasSetup(role: MembershipRole | undefined): boolean {
  return role === 'owner' || role === 'manager'
}

export function setupProgress(steps: SetupStep[]): { done: number; total: number } {
  return { done: steps.filter((step) => step.status === 'done').length, total: steps.length }
}

function complete(setup: Setup): boolean {
  return setup.steps.every((step) => step.status === 'done')
}

export function showSetupCard(setup: Setup): boolean {
  return !setup.dismissed && !complete(setup)
}

/** Only an owner can put the checklist away, so only an owner is offered it back. */
export function showSetupReopen(setup: Setup, role: MembershipRole | undefined): boolean {
  return role === 'owner' && setup.dismissed && !complete(setup)
}

/** The bar fills from the left by count, not by position: steps can be finished in any order. */
export function progressSegments(steps: SetupStep[]): SetupStepStatus[] {
  const order: SetupStepStatus[] = ['done', 'pending', 'todo']
  return steps.map((step) => step.status).sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

/** Until the first booking the steps are the whole dashboard; after it the company is operating,
 *  so its figures come back with the steps above them. */
export function setupIsWholePage(setup: Setup): boolean {
  return showSetupCard(setup) && !setup.steps.some((step) => step.key === 'booking' && step.status === 'done')
}
