import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { useUIStore } from '@/state/ui.store'
import { Sidebar } from './Sidebar'

const bookings = () => screen.getByRole('link', { name: /Bookings/ })

describe('Sidebar badges', () => {
  // The "system" theme asks `matchMedia`, which jsdom does not have.
  beforeEach(() => useUIStore.setState({ theme: 'light', sidebarCollapsed: false }))

  it('shows the count it is given beside its link', () => {
    render(
      <MemoryRouter>
        <Sidebar badges={{ Bookings: '3' }} />
      </MemoryRouter>,
    )

    expect(bookings()).toHaveTextContent('3')
  })

  it('shows no number on Bookings when nothing is waiting', () => {
    // It used to read a fixed "12", whatever the book held.
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )

    expect(bookings()).toHaveTextContent(/^Bookings$/)
  })
})

describe('Sidebar account', () => {
  beforeEach(() => useUIStore.setState({ theme: 'light', sidebarCollapsed: false }))

  it('shows the signed-in account it is given', () => {
    // It used to read a fixed "Diego Rivas, Owner", whoever was signed in.
    render(
      <MemoryRouter>
        <Sidebar account={{ name: 'Ana López', role: 'manager', organization: 'Coastline Rentals' }} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Ana López')).toBeInTheDocument()
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('Manager · Coastline Rentals')).toBeInTheDocument()
    expect(screen.queryByText('Diego Rivas')).not.toBeInTheDocument()
  })
})
