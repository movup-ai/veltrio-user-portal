// First: the pinned clock must be in place before any app module reads the date.
import './clock'
import './harness.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { DashboardLayout } from '@/app/layouts/DashboardLayout'
import { AppProviders } from '@/app/providers/AppProviders'
import i18n from '@/i18n'
import { BookingDetailsPage } from '@/pages/bookings/BookingDetailsPage'
import { CalendarPage } from '@/pages/calendar/CalendarPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { VehiclesPage } from '@/pages/vehicles/VehiclesPage'
import { useUIStore } from '@/state/ui.store'
import { installMocks } from './mocks'

installMocks()
useUIStore.setState({ theme: 'light', sidebarCollapsed: false })

const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'vehicles', element: <VehiclesPage /> },
      { path: 'bookings/:bookingId', element: <BookingDetailsPage /> },
    ],
  },
])

const lang = new URLSearchParams(window.location.search).get('lang') === 'es' ? 'es' : 'en'

void i18n.changeLanguage(lang).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
})
