import type { Setup, SetupStepKey, SetupStepStatus } from '../types/setup.types'

export interface SetupWire {
  steps: { key: SetupStepKey; status: SetupStepStatus }[]
  dismissed: boolean
}

export function toSetup(wire: SetupWire): Setup {
  return { steps: wire.steps.map(({ key, status }) => ({ key, status })), dismissed: wire.dismissed }
}
