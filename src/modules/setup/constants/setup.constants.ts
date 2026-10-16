import {
  CalendarPlus,
  CarFront,
  CreditCard,
  FileSignature,
  MapPin,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { BILLING_SETTINGS_PATH } from '@/modules/billing/utils/billing.utils'
import { PAYMENT_SETTINGS_PATH } from '@/modules/payments/utils/payment-account.utils'
import type { SetupStepKey } from '../types/setup.types'

/** Where each step is done. */
export const SETUP_STEPS: Record<SetupStepKey, { icon: LucideIcon; to: string }> = {
  plan: { icon: Sparkles, to: BILLING_SETTINGS_PATH },
  vehicle: { icon: CarFront, to: '/vehicles/new' },
  branch: { icon: MapPin, to: '/locations' },
  agreement: { icon: FileSignature, to: '/agreements' },
  payments: { icon: CreditCard, to: PAYMENT_SETTINGS_PATH },
  booking: { icon: CalendarPlus, to: '/bookings/new' },
}
