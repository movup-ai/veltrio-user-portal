import { describe, expect, it } from 'vitest'
import type { Member } from '../types/users.types'
import { isLastOwner } from './members.utils'

function member(userId: string, role: Member['role']): Member {
  return { userId, fullName: userId, email: `${userId}@example.com`, role, joinedAt: '', isYou: false }
}

describe('isLastOwner', () => {
  it('holds for the only owner, whatever else the team has', () => {
    const pat = member('pat', 'owner')
    expect(isLastOwner(pat, [pat, member('jo', 'manager'), member('sam', 'staff')])).toBe(true)
  })

  it('frees both owners once there are two', () => {
    const pat = member('pat', 'owner')
    const jo = member('jo', 'owner')
    expect(isLastOwner(pat, [pat, jo])).toBe(false)
    expect(isLastOwner(jo, [pat, jo])).toBe(false)
  })

  it('never holds for a manager or staff', () => {
    const jo = member('jo', 'manager')
    expect(isLastOwner(jo, [member('pat', 'owner'), jo])).toBe(false)
  })
})
