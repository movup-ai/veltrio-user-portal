import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useOrganizationStore } from '@/state/organization.store'
import { ROLE_PERMISSIONS } from '@/utils/permissions'
import type { MembershipRole } from '@/types/user'
import { Can } from './Can'

function setPermissions(permissions: string[]) {
  useOrganizationStore.setState({
    membership: {
      organizationId: 'org_1',
      organizationName: 'Test Org',
      subdomain: 'test-org',
      role: 'owner',
      permissions: permissions as never,
    },
  })
}

afterEach(() => {
  useOrganizationStore.setState({ membership: null })
})

describe('Can', () => {
  it('renders children when the user has the required permission', () => {
    setPermissions(['vehicles.create'])
    render(<Can permission="vehicles.create">Add Vehicle</Can>)
    expect(screen.getByText('Add Vehicle')).toBeInTheDocument()
  })

  it('renders nothing when the user lacks the permission', () => {
    setPermissions(['vehicles.read'])
    render(<Can permission="vehicles.create">Add Vehicle</Can>)
    expect(screen.queryByText('Add Vehicle')).not.toBeInTheDocument()
  })

  it('renders the fallback when provided and permission is missing', () => {
    setPermissions([])
    render(
      <Can permission="vehicles.create" fallback="No access">
        Add Vehicle
      </Can>,
    )
    expect(screen.getByText('No access')).toBeInTheDocument()
  })
})

/**
 * These mirror what the API enforces in app/modules/vehicles/router.py: adding a vehicle to
 * the fleet or destroying one is an owner/manager action. If the two ever drift, the portal
 * either hides a button that works or offers one the API answers with 403.
 */
describe('role permissions against what the API enforces', () => {
  function renderFor(
    role: MembershipRole,
    permission: 'vehicles.create' | 'vehicles.delete' | 'verifications.delete',
  ) {
    setPermissions([...ROLE_PERMISSIONS[role]])
    render(<Can permission={permission}>Manage fleet</Can>)
  }

  it.each(['owner', 'manager'] as const)('lets %s change what the fleet consists of', (role) => {
    renderFor(role, 'vehicles.create')
    expect(screen.getByText('Manage fleet')).toBeInTheDocument()
  })

  it.each(['owner', 'manager'] as const)('lets %s delete a check from the log', (role) => {
    renderFor(role, 'verifications.delete')
    expect(screen.getByText('Manage fleet')).toBeInTheDocument()
  })

  it.each(['vehicles.create', 'vehicles.delete', 'verifications.delete'] as const)(
    'hides %s from staff',
    (permission) => {
      renderFor('staff', permission)
      expect(screen.queryByText('Manage fleet')).not.toBeInTheDocument()
    },
  )

  it('still lets staff work the daily flow', () => {
    setPermissions([...ROLE_PERMISSIONS.staff])
    render(<Can permission="vehicles.update">Edit mileage</Can>)
    expect(screen.getByText('Edit mileage')).toBeInTheDocument()
  })
})
