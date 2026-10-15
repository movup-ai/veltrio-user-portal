import { describe, expect, it } from 'vitest'
import type { BookingDraft } from '../types/booking.types'
import { additionalDriversSchema } from '../schema/booking.schema'
import { resolveDraftResume, restoredDrivers } from './booking.draft-resume'

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

describe('restoredDrivers', () => {
  const t = ((key: string) => key) as never
  // Saved before a driver's licence state and expiry were asked for.
  const older = [{ id: 'x1', name: 'Ana Ruiz', licenceNumber: 'D123', pricePerDay: 12 }]

  it('fills in the licence fields an older draft never saved, so the form can still submit', () => {
    const drivers = restoredDrivers(older)

    expect(additionalDriversSchema(t).safeParse({ additionalDrivers: drivers }).success).toBe(true)
    expect(drivers).toEqual([{ ...older[0], licenceState: '', licenceExpiry: '' }])
  })

  it('keeps licence details the draft already holds', () => {
    const saved = [{ ...older[0], licenceState: 'FL', licenceExpiry: '2028-04-30' }]

    expect(restoredDrivers(saved)).toEqual(saved)
  })

  it('reads a draft with no drivers as none', () => {
    expect(restoredDrivers(undefined)).toEqual([])
  })
})
