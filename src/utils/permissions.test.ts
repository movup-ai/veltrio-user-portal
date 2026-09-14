import { describe, expect, it } from 'vitest'
import { hasAllPermissions, hasAnyPermission, hasPermission } from './permissions'

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
