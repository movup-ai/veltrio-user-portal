import type { MembershipRole } from '@/types/user'
import type { Member } from '../types/users.types'

/** Whether this member is the company's only owner, whom the API will neither demote nor remove. */
export function isLastOwner(member: Member, members: Member[]): boolean {
  return member.role === 'owner' && members.filter((m) => m.role === 'owner').length <= 1
}

export type RoleChangeConfirmation = 'stepDown' | 'makeOwner' | 'removeOwner'

/**
 * Which warning a role change needs before it is sent, if any. Anything to or from owner is
 * asked first: it hands over, or takes away, billing and the team in one click.
 */
export function roleChangeConfirmation(
  member: Member,
  role: MembershipRole,
): RoleChangeConfirmation | undefined {
  if (member.role === role) return undefined
  if (member.role === 'owner') return member.isYou ? 'stepDown' : 'removeOwner'
  return role === 'owner' ? 'makeOwner' : undefined
}
