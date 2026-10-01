import { describe, expect, it } from 'vitest'
import { initialFurthestStep } from './form-steps'

describe('initialFurthestStep', () => {
  it('opens every step when editing, so the tabs work before Next is ever pressed', () => {
    expect(initialFurthestStep(true, 4)).toBe(3)
  })

  it('opens only the first step of a new vehicle', () => {
    expect(initialFurthestStep(false, 4)).toBe(0)
  })
})
