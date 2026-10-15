import type { MembershipRole } from '@/types/user'
import type { InvitationPreview, MyInvitation } from '../types/users.types'

/** One invitation the signed-in account can accept. */
export interface JoinTarget {
  id: string
  companyName: string
  logoUrl?: string
  role: MembershipRole
}

export type InviteView =
  | { kind: 'loading' }
  /** Unknown, revoked or already used: the API says only "not found". */
  | { kind: 'notFound' }
  | { kind: 'expired'; companyName: string }
  | { kind: 'signedOut'; preview: InvitationPreview }
  /** No link to preview, so there is nothing to show until they sign in. */
  | { kind: 'signIn' }
  | { kind: 'wrongAccount'; preview: InvitationPreview; signedInAs: string }
  | { kind: 'alreadyMember' }
  | { kind: 'join'; invitations: JoinTarget[] }
  | { kind: 'none' }

interface InviteInputs {
  token?: string
  signedIn: boolean
  /** The link's invitation; undefined while loading, null when the API had none. */
  preview: InvitationPreview | null | undefined
  /** The signed-in account's invitations; undefined until known. */
  mine: MyInvitation[] | undefined
  /** Clerk's primary email for the session. */
  email?: string
  hasCompany: boolean
}

/**
 * What the invite page shows. Ordered so a link always says what it is for first: an expired or
 * used link says so before asking anyone to sign in for nothing.
 */
export function inviteView({ token, signedIn, preview, mine, email, hasCompany }: InviteInputs): InviteView {
  if (token) {
    if (preview === undefined) return { kind: 'loading' }
    if (preview === null) return { kind: 'notFound' }
    if (preview.expired) return { kind: 'expired', companyName: preview.companyName }
    if (!signedIn) return { kind: 'signedOut', preview }
    if (hasCompany) return { kind: 'alreadyMember' }
    // The API matches the verified address the same way, case aside.
    if (email && email.toLowerCase() !== preview.email.toLowerCase()) {
      return { kind: 'wrongAccount', preview, signedInAs: email }
    }
    const { id, companyName, logoUrl, role } = preview
    return { kind: 'join', invitations: [{ id, companyName, logoUrl, role }] }
  }

  if (!signedIn) return { kind: 'signIn' }
  if (hasCompany) return { kind: 'alreadyMember' }
  if (mine === undefined) return { kind: 'loading' }
  const open = mine.filter((invitation) => !invitation.expired)
  if (open.length) return { kind: 'join', invitations: open }
  if (mine.length) return { kind: 'expired', companyName: mine[0].companyName }
  return { kind: 'none' }
}

/** Whether a fresh account should be offered to join before it is asked to set up a company. */
export function hasOpenInvitation(mine: MyInvitation[] | undefined): boolean {
  return Boolean(mine?.some((invitation) => !invitation.expired))
}
