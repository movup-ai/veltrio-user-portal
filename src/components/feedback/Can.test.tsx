import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useOrganizationStore } from '@/state/organization.store'
import { Can } from './Can'

function setPermissions(permissions: string[]) {
  useOrganizationStore.setState({
    activeMembership: {
      organizationId: 'org_1',
      organizationName: 'Test Org',
      role: 'owner',
      permissions: permissions as never,
    },
  })
}

afterEach(() => {
  useOrganizationStore.setState({ activeMembership: null, memberships: [], activeOrganizationId: null })
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
