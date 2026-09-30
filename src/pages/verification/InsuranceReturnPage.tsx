import { useAuth } from '@clerk/clerk-react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Button } from '@/components/ui/button'
import { useInsuranceReturn } from '@/modules/bookings/hooks/use-verification'
import { insuranceReturnTo } from '@/modules/bookings/utils/booking.insurance-redirect'

/**
 * Where Axle sends the renter back to, with no login needed. A tab staff opened closes itself
 * once the check is finished; anyone else - usually the renter on their phone - is thanked here.
 * The renter is not told the verdict: that is for the rental company to act on.
 */
export function InsuranceReturnPage() {
  const { t } = useTranslation('bookings')
  const { isSignedIn } = useAuth()
  const shown = useInsuranceReturn()

  if (!shown) return <LoadingState label={t('insuranceReturn.finishing')} />

  const result = shown.type === 'finished' ? 'done' : shown.type === 'failed' ? 'failed' : 'unfinished'

  return (
    <div className="border-border bg-card flex w-full max-w-md flex-col items-center gap-3 rounded-lg border p-8 text-center shadow-sm">
      {result === 'done' ? (
        <CircleCheck className="text-success size-10" aria-hidden />
      ) : (
        <CircleAlert className="text-warning size-10" aria-hidden />
      )}
      <h1 className="text-section-title m-0">{t(`insuranceReturn.${result}.title`)}</h1>
      <p className="text-description m-0">{t(`insuranceReturn.${result}.body`)}</p>
      {/* Staff whose popup was blocked land here in their own tab, so give them a way back. */}
      {isSignedIn && (
        <Button asChild variant="outline" className="mt-2">
          <Link to={insuranceReturnTo(window.location.search)}>{t('insuranceReturn.back')}</Link>
        </Button>
      )}
    </div>
  )
}
