import { describe, expect, it } from 'vitest'
import type { BookingDraft } from '../types/booking.types'
import { resolveDraftResume } from './booking.draft-resume'

const DRAFT: BookingDraft = {
  id: 'd1',
  reference: 'DR-10001',
  payload: { customerName: 'Marisol Vega' },
  createdAt: '2026-09-23T09:00:00.000Z',
  updatedAt: '2026-09-23T09:30:00.000Z',
}

const LOADED = { isLoading: false, isError: false }

describe('resolveDraftResume', () => {
  it('opens a fresh wizard when no draft was asked for', () => {
    expect(resolveDraftResume(null, [DRAFT], LOADED)).toEqual({ kind: 'new' })
  })

  it('resumes the requested draft', () => {
    expect(resolveDraftResume('d1', [DRAFT], LOADED)).toEqual({ kind: 'resume', draft: DRAFT })
  })

  it('waits rather than guessing while the list loads', () => {
    expect(resolveDraftResume('d1', undefined, { isLoading: true, isError: false })).toEqual({
      kind: 'loading',
    })
  })

  it('reports a failed load instead of opening a blank form', () => {
    // The bug this pins: falling through here hands the wizard null values, and saving then
    // creates a second draft rather than updating the one being resumed.
    expect(resolveDraftResume('d1', undefined, { isLoading: false, isError: true })).toEqual({
      kind: 'failed',
    })
  })

  it('treats no data without an error as a failure too, not as a missing draft', () => {
    expect(resolveDraftResume('d1', undefined, LOADED)).toEqual({ kind: 'failed' })
  })

  it('distinguishes a draft that is genuinely gone from one that failed to load', () => {
    expect(resolveDraftResume('gone', [DRAFT], LOADED)).toEqual({ kind: 'missing' })
  })
})
