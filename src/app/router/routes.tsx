import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { ONBOARDING_PATHS, type AuthRouteHandle } from '@/app/layouts/onboarding-steps'
import { DashboardLayout } from '@/app/layouts/DashboardLayout'
import { PublicLayout } from '@/app/layouts/PublicLayout'
import { ClerkRouterProvider } from '@/app/providers/ClerkRouterProvider'
import { LoadingState } from '@/components/feedback/LoadingState'
import { AgreementsPage } from '@/pages/agreements/AgreementsPage.lazy'
// Not lazy: two thin wrappers over Clerk, which is in the main bundle anyway. A lazy chunk put a
// spinner and one more round trip in front of the sign-in form's skeleton.
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { InsuranceReturnPage } from '@/pages/verification/InsuranceReturnPage'
import { LegacyAppRedirect } from './legacy-app-redirect'
import { ProtectedRoute } from './protected-route'

const OnboardingPage = lazy(() =>
  import('@/pages/auth/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const OnboardingPlanPage = lazy(() =>
  import('@/pages/auth/OnboardingPlanPage').then((m) => ({ default: m.OnboardingPlanPage })),
)
const OnboardingReadyPage = lazy(() =>
  import('@/pages/auth/OnboardingReadyPage').then((m) => ({ default: m.OnboardingReadyPage })),
)
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const VehiclesPage = lazy(() =>
  import('@/pages/vehicles/VehiclesPage').then((m) => ({ default: m.VehiclesPage })),
)
const VehicleFormPage = lazy(() =>
  import('@/pages/vehicles/VehicleFormPage').then((m) => ({ default: m.VehicleFormPage })),
)
const VehicleDetailsPage = lazy(() =>
  import('@/pages/vehicles/VehicleDetailsPage').then((m) => ({ default: m.VehicleDetailsPage })),
)
const BookingsPage = lazy(() =>
  import('@/pages/bookings/BookingsPage').then((m) => ({ default: m.BookingsPage })),
)
const BookingFormPage = lazy(() =>
  import('@/pages/bookings/BookingFormPage').then((m) => ({ default: m.BookingFormPage })),
)
const BookingDetailsPage = lazy(() =>
  import('@/pages/bookings/BookingDetailsPage').then((m) => ({ default: m.BookingDetailsPage })),
)
const VerificationPage = lazy(() =>
  import('@/pages/verification/VerificationPage').then((m) => ({ default: m.VerificationPage })),
)
const CustomersPage = lazy(() =>
  import('@/pages/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })),
)
const CustomerDetailsPage = lazy(() =>
  import('@/pages/customers/CustomerDetailsPage').then((m) => ({ default: m.CustomerDetailsPage })),
)
const PaymentsPage = lazy(() =>
  import('@/pages/payments/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
)
const LocationsPage = lazy(() =>
  import('@/pages/locations/LocationsPage').then((m) => ({ default: m.LocationsPage })),
)
const PricingPage = lazy(() =>
  import('@/pages/pricing/PricingPage').then((m) => ({ default: m.PricingPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const CalendarPage = lazy(() =>
  import('@/pages/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
)
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

const step = (name: AuthRouteHandle['step']): AuthRouteHandle => ({ step: name })

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
          { path: '/login/*', element: <LoginPage /> },
          { path: '/sign-up/*', element: <SignUpPage />, handle: step('account') },
          {
            path: ONBOARDING_PATHS.company,
            element: <OnboardingPage />,
            handle: step('company'),
          },
          {
            // Behind the gate: from here on the company exists, and its plan is read through it.
            element: <ProtectedRoute />,
            children: [
              {
                path: ONBOARDING_PATHS.plan,
                element: <OnboardingPlanPage />,
                handle: step('plan'),
              },
              {
                path: ONBOARDING_PATHS.ready,
                element: <OnboardingReadyPage />,
                handle: step('ready'),
              },
            ],
          },
        ],
      },

      {
        element: <PublicLayout />,
        children: [
          // Public: Axle returns the renter here, and they may be on their own phone. Not lazy,
          { path: '/insurance/return', element: <InsuranceReturnPage /> },
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
