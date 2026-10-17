import { describe, expect, it } from 'vitest'
import { ApiError } from '@/types/api'
import type { InvitationPreview, MyInvitation } from '../types/users.types'
import { acceptError, hasOpenInvitation, inviteView } from './invite.utils'

const preview: InvitationPreview = {
  id: 'inv_1',
  companyName: 'ABC Rentals',
  email: 'Jo@example.com',
  role: 'manager',
  expired: false,
}

function mine(id: string, expired = false): MyInvitation {
  return { id, companyName: `Company ${id}`, role: 'staff', expiresAt: '', expired }
}

const linked = { token: 'tok', signedIn: true, preview, mine: [], email: 'jo@example.com', hasCompany: false }

describe('inviteView with a link', () => {
  it('waits for the link, then says when it is unknown, used or revoked', () => {
    expect(inviteView({ ...linked, preview: undefined }).kind).toBe('loading')
    expect(inviteView({ ...linked, preview: null }).kind).toBe('notFound')
  })

  it('says a link has expired before asking anyone to sign in', () => {
    const view = inviteView({ ...linked, signedIn: false, preview: { ...preview, expired: true } })
    expect(view).toEqual({ kind: 'expired', companyName: 'ABC Rentals' })
  })

  it('shows a signed-out visitor what they are invited to', () => {
    expect(inviteView({ ...linked, signedIn: false })).toEqual({ kind: 'signedOut', preview })
  })

  it('offers to join when the session is the invited address, case aside', () => {
    expect(inviteView(linked)).toEqual({
      kind: 'join',
      invitations: [{ id: 'inv_1', companyName: 'ABC Rentals', logoUrl: undefined, role: 'manager' }],
    })
  })

  it('names both addresses when another account is signed in', () => {
    expect(inviteView({ ...linked, email: 'sam@example.com' })).toEqual({
      kind: 'wrongAccount',
      preview,
      signedInAs: 'sam@example.com',
    })
  })

  it('tells someone who already has a company that they cannot join a second', () => {
    expect(inviteView({ ...linked, hasCompany: true }).kind).toBe('alreadyMember')
  })
})

describe('inviteView without a link', () => {
  const bare = { signedIn: true, preview: undefined, mine: undefined, hasCompany: false }

  it('needs a session first, since there is nothing to preview', () => {
    expect(inviteView({ ...bare, signedIn: false }).kind).toBe('signIn')
  })

  it('lists the open invitations for the account, leaving out expired ones', () => {
    expect(inviteView({ ...bare, mine: undefined }).kind).toBe('loading')
    expect(inviteView({ ...bare, mine: [mine('a'), mine('b', true)] })).toEqual({
      kind: 'join',
      invitations: [mine('a')],
    })
  })

  it('says an only invitation has expired, and when there is none at all', () => {
    expect(inviteView({ ...bare, mine: [mine('a', true)] })).toEqual({
      kind: 'expired',
      companyName: 'Company a',
    })
    expect(inviteView({ ...bare, mine: [] }).kind).toBe('none')
  })
})

describe('hasOpenInvitation', () => {
  it('counts only invitations that can still be accepted', () => {
    expect(hasOpenInvitation(undefined)).toBe(false)
    expect(hasOpenInvitation([mine('a', true)])).toBe(false)
    expect(hasOpenInvitation([mine('a', true), mine('b')])).toBe(true)
  })
})

describe('acceptError', () => {
  it.each(['invitation_expired', 'already_onboarded', 'email_in_use', 'tenant_suspended'])(
    'names %s by its code, not the English the API sent',
    (code) => {
      expect(acceptError(new ApiError('conflict', 'Server words', { code }))).toBe(code)
    },
  )

  it('falls back to a general line for anything it does not know', () => {
    const unknown = new ApiError('forbidden', 'User has not completed onboarding', {
      code: 'user_not_onboarded',
    })
    expect(acceptError(unknown)).toBe('generic')
    expect(acceptError(new ApiError('network_error', 'Offline'))).toBe('generic')
    expect(acceptError(new Error('boom'))).toBe('generic')
  })
})
