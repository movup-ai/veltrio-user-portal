import type { Member } from '../types/users.types'

/** Whether this member is the company's only owner, whom the API will neither demote nor remove. */
export function isLastOwner(member: Member, members: Member[]): boolean {
  return member.role === 'owner' && members.filter((m) => m.role === 'owner').length <= 1
}
