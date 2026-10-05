import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { DashboardLayout } from '@/app/layouts/DashboardLayout'
import { ClerkRouterProvider } from '@/app/providers/ClerkRouterProvider'
import { LoadingState } from '@/components/feedback/LoadingState'
import { AgreementsPage } from '@/pages/agreements/AgreementsPage.lazy'
import { InsuranceReturnPage } from '@/pages/verification/InsuranceReturnPage'
import { PaymentPage } from '@/pages/pay/PaymentPage.lazy'
import { ReceiptPage } from '@/pages/receipt/ReceiptPage.lazy'
import { SignPage } from '@/pages/sign/SignPage.lazy'
import { LegacyAppRedirect } from './legacy-app-redirect'
import { ProtectedRoute } from './protected-route'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const SignUpPage = lazy(() => import('@/pages/auth/SignUpPage').then((m) => ({ default: m.SignUpPage })))
const OnboardingPage = lazy(() =>
  import('@/pages/auth/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const VehiclesPage = lazy(() => import('@/pages/vehicles/VehiclesPage').then((m) => ({ default: m.VehiclesPage })))
const VehicleFormPage = lazy(() => import('@/pages/vehicles/VehicleFormPage').then((m) => ({ default: m.VehicleFormPage })))
const VehicleDetailsPage = lazy(() =>
  import('@/pages/vehicles/VehicleDetailsPage').then((m) => ({ default: m.VehicleDetailsPage })),
)
const BookingsPage = lazy(() => import('@/pages/bookings/BookingsPage').then((m) => ({ default: m.BookingsPage })))
const BookingFormPage = lazy(() => import('@/pages/bookings/BookingFormPage').then((m) => ({ default: m.BookingFormPage })))
const BookingDetailsPage = lazy(() =>
  import('@/pages/bookings/BookingDetailsPage').then((m) => ({ default: m.BookingDetailsPage })),
)
const VerificationPage = lazy(() =>
  import('@/pages/verification/VerificationPage').then((m) => ({ default: m.VerificationPage })),
)
const CustomersPage = lazy(() => import('@/pages/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const CustomerDetailsPage = lazy(() =>
  import('@/pages/customers/CustomerDetailsPage').then((m) => ({ default: m.CustomerDetailsPage })),
)
const PaymentsPage = lazy(() => import('@/pages/payments/PaymentsPage').then((m) => ({ default: m.PaymentsPage })))
const LocationsPage = lazy(() => import('@/pages/locations/LocationsPage').then((m) => ({ default: m.LocationsPage })))
const PricingPage = lazy(() => import('@/pages/pricing/PricingPage').then((m) => ({ default: m.PricingPage })))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const CalendarPage = lazy(() => import('@/pages/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<LoadingState />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    element: <ClerkRouterProvider />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          // Splat paths: Clerk's own screens (verification, SSO callback, ...) live under these.
          { path: '/login/*', element: withSuspense(<LoginPage />) },
          { path: '/sign-up/*', element: withSuspense(<SignUpPage />) },
          { path: '/onboarding', element: withSuspense(<OnboardingPage />) },
          // Public: Axle returns the renter here, and they may be on their own phone. Not lazy,
          { path: '/insurance/return', element: <InsuranceReturnPage /> },
          // Public: the renter pays here from the link the counter sent, on any device.
          { path: '/pay/:tenantId/:token', element: withSuspense(<PaymentPage />) },
          // Public: the renter's receipt, from the counter's link or the payment page.
          { path: '/receipt/:tenantId/:bookingId/:token', element: withSuspense(<ReceiptPage />) },
          // Public: the renter reads and signs their rental agreement here, then keeps it as their copy.
          { path: '/sign/:tenantId/:contractId/:token', element: withSuspense(<SignPage />) },
        ],
      },

      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              { path: 'dashboard', element: withSuspense(<DashboardPage />) },

              { path: 'vehicles', element: withSuspense(<VehiclesPage />) },
              { path: 'vehicles/new', element: withSuspense(<VehicleFormPage />) },
              { path: 'vehicles/:vehicleId', element: withSuspense(<VehicleDetailsPage />) },
              { path: 'vehicles/:vehicleId/edit', element: withSuspense(<VehicleFormPage />) },

              { path: 'bookings', element: withSuspense(<BookingsPage />) },
              { path: 'bookings/new', element: withSuspense(<BookingFormPage />) },
              { path: 'bookings/:bookingId', element: withSuspense(<BookingDetailsPage />) },

              { path: 'calendar', element: withSuspense(<CalendarPage />) },

              { path: 'customers', element: withSuspense(<CustomersPage />) },
              { path: 'customers/:customerId', element: withSuspense(<CustomerDetailsPage />) },

              { path: 'verification', element: withSuspense(<VerificationPage />) },

              { path: 'payments', element: withSuspense(<PaymentsPage />) },
              { path: 'locations', element: withSuspense(<LocationsPage />) },
              { path: 'pricing', element: withSuspense(<PricingPage />) },

              { path: 'agreements', element: withSuspense(<AgreementsPage />) },
              { path: 'agreements/:templateId', element: withSuspense(<AgreementsPage />) },

              { path: 'settings', element: withSuspense(<SettingsPage />) },
              { path: 'settings/organization', element: withSuspense(<SettingsPage />) },
              { path: 'settings/users', element: withSuspense(<SettingsPage />) },
              { path: 'settings/roles', element: withSuspense(<SettingsPage />) },
              { path: 'settings/billing', element: withSuspense(<SettingsPage />) },
              { path: 'settings/brand', element: withSuspense(<SettingsPage />) },
              { path: 'settings/payments', element: withSuspense(<SettingsPage />) },
            ],
          },
        ],
      },

      { path: '/app/*', element: <LegacyAppRedirect /> },

      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
])
