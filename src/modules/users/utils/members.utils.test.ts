import { describe, expect, it } from 'vitest'
import type { Member } from '../types/users.types'
import { isLastOwner, roleChangeConfirmation } from './members.utils'

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

describe('roleChangeConfirmation', () => {
  it('asks before making a teammate an owner', () => {
    expect(roleChangeConfirmation(member('jo', 'manager'), 'owner')).toBe('makeOwner')
    expect(roleChangeConfirmation(member('sam', 'staff'), 'owner')).toBe('makeOwner')
  })

  it('asks before taking owner access from a teammate', () => {
    expect(roleChangeConfirmation(member('pat', 'owner'), 'manager')).toBe('removeOwner')
  })

  it('asks an owner stepping down in their own words', () => {
    expect(roleChangeConfirmation({ ...member('me', 'owner'), isYou: true }, 'staff')).toBe('stepDown')
  })

  it('lets a change between manager and staff through at once', () => {
    expect(roleChangeConfirmation(member('jo', 'manager'), 'staff')).toBeUndefined()
    expect(roleChangeConfirmation(member('sam', 'staff'), 'manager')).toBeUndefined()
  })
})
