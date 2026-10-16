/** Mirrors the API's SetupStepKey (tenants/schemas.py), in the order the steps are shown. */
export type SetupStepKey = 'plan' | 'vehicle' | 'branch' | 'agreement' | 'payments' | 'booking'

/** Pending is waiting on someone else: Stripe reviewing the account. */
export type SetupStepStatus = 'todo' | 'pending' | 'done'

export interface SetupStep {
  key: SetupStepKey
  status: SetupStepStatus
}

export interface Setup {
  steps: SetupStep[]
  dismissed: boolean
}

export interface SetupPatch {
  dismissed?: boolean
  agreementReviewed?: boolean
}
