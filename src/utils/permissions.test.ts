import { describe, expect, it } from 'vitest'
import { ROLE_PERMISSIONS, hasAllPermissions, hasAnyPermission, hasPermission } from './permissions'
import type { Permission } from '@/types/user'

/** Everything any role grants — owner must stay a superset of it as roles change. */
const ALL_GRANTED: Permission[] = [...new Set(Object.values(ROLE_PERMISSIONS).flat())]

const granted = ['vehicles.read', 'vehicles.create'] as const

describe('hasPermission', () => {
  it('returns true when the permission is granted', () => {
    expect(hasPermission([...granted], 'vehicles.read')).toBe(true)
  })

  it('returns false when the permission is missing', () => {
    expect(hasPermission([...granted], 'vehicles.delete')).toBe(false)
  })
})

describe('hasAnyPermission', () => {
  it('returns true if at least one required permission is granted', () => {
    expect(hasAnyPermission([...granted], ['vehicles.delete', 'vehicles.read'])).toBe(true)
  })

  it('returns false if none of the required permissions are granted', () => {
    expect(hasAnyPermission([...granted], ['vehicles.delete', 'bookings.cancel'])).toBe(false)
  })
})

describe('hasAllPermissions', () => {
  it('returns true only when every required permission is granted', () => {
    expect(hasAllPermissions([...granted], ['vehicles.read', 'vehicles.create'])).toBe(true)
    expect(hasAllPermissions([...granted], ['vehicles.read', 'vehicles.delete'])).toBe(false)
  })
})

describe('ROLE_PERMISSIONS', () => {
  it('gives owners every permission any other role grants', () => {
    expect(hasAllPermissions(ROLE_PERMISSIONS.owner, ALL_GRANTED)).toBe(true)
  })

  it('withholds organization administration from managers', () => {
    expect(hasAnyPermission(ROLE_PERMISSIONS.manager, ['settings.manage', 'users.manage'])).toBe(false)
  })

  it('withholds destructive and money-moving actions from staff', () => {
    expect(
      hasAnyPermission(ROLE_PERMISSIONS.staff, ['vehicles.delete', 'bookings.cancel', 'payments.refund']),
    ).toBe(false)
  })

  it('lets staff run the daily booking flow', () => {
    expect(
      hasAllPermissions(ROLE_PERMISSIONS.staff, ['bookings.read', 'bookings.create', 'bookings.update']),
    ).toBe(true)
  })
})
