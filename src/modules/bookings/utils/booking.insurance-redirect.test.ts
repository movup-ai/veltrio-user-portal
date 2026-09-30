import { describe, expect, it } from 'vitest'
import {
  insuranceReturnTo,
  insuranceReturnUri,
  readInsuranceRedirect,
} from './booking.insurance-redirect'

// Axle's own documented redirect, with the ids our redirect URI carries in front.
const AXLE_SAMPLE =
  '?tenantId=ten_1&verificationId=ver_1&status=complete&authCode=cod_LwPJhgxnjinMEPfGYc-XV' +
  '&client=cli_mZj6YGXhQyQnccN97aXbq&result=link'

describe('reading the page Axle returns the renter to', () => {
  it('reads the code and our id off the documented redirect', () => {
    expect(readInsuranceRedirect(AXLE_SAMPLE)).toEqual({
      outcome: 'complete',
      tenantId: 'ten_1',
      verificationId: 'ver_1',
      authCode: 'cod_LwPJhgxnjinMEPfGYc-XV',
    })
  })

  it('does not look for an id Axle never sends', () => {
    // The first version read `verificationId ?? user`. Axle sends neither, so without our own
    // id on the redirect URI the returning page silently did nothing.
    const axleOnly = '?status=complete&authCode=cod_1&client=cli_1&result=link'

    expect(readInsuranceRedirect(axleOnly)).toBeUndefined()
  })

  it('cannot complete without the tenant, which the page has no login to supply', () => {
    expect(readInsuranceRedirect(AXLE_SAMPLE.replace('tenantId=ten_1&', ''))?.outcome).toBe(
      'unfinished',
    )
  })

  it('treats a renter backing out as unfinished, with nothing to exchange', () => {
    expect(readInsuranceRedirect('?verificationId=ver_1&status=exit')).toEqual({
      outcome: 'unfinished',
      verificationId: 'ver_1',
    })
  })

  it('treats a completed status with no code as unfinished', () => {
    expect(readInsuranceRedirect('?verificationId=ver_1&status=complete')?.outcome).toBe(
      'unfinished',
    )
  })

  it('ignores an ordinary page load', () => {
    expect(readInsuranceRedirect('')).toBeUndefined()
    expect(readInsuranceRedirect('?page=2')).toBeUndefined()
  })
})

describe('returning from a session', () => {
  it('sends the renter to the return page, remembering where the session was opened', () => {
    const uri = insuranceReturnUri({
      origin: 'https://portal.test',
      pathname: '/app/bookings/BK-1',
      search: '?tab=checks',
    })

    expect(uri).toBe(
      'https://portal.test/insurance/return?returnTo=%2Fapp%2Fbookings%2FBK-1%3Ftab%3Dchecks',
    )
    expect(insuranceReturnTo(new URL(uri).search + AXLE_SAMPLE.replace('?', '&'))).toBe(
      '/app/bookings/BK-1?tab=checks',
    )
  })

  it('goes back only to a page on this site', () => {
    // The value arrives in the URL; honouring a full address would make this an open redirect.
    for (const hostile of ['https://evil.test', '//evil.test/app', 'javascript:alert(1)']) {
      expect(insuranceReturnTo(`?returnTo=${encodeURIComponent(hostile)}`)).toBe('/app/verification')
    }
    expect(insuranceReturnTo('')).toBe('/app/verification')
  })
})
