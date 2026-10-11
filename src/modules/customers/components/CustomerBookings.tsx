import { useMemo, useState } from 'react'
import { CalendarX2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { RecordTable } from '@/components/data-display/RecordTable'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { NO_BOOKING_FILTERS } from '@/modules/bookings/constants/booking.constants'
import { useBookingPage } from '@/modules/bookings/hooks/use-bookings'
import {
  customerBookingColumns,
  customerBookingRow,
  withVehicleImage,
} from '@/modules/bookings/utils/booking.utils'
import { useVehicleThumbnails } from '@/modules/vehicles/hooks/use-vehicles'

interface Props {
  customerId: string
}

/** Every booking a customer has made, in the bookings list's own table less its Customer column. */
export function CustomerBookings({ customerId }: Props) {
  const { t } = useTranslation('customers')
  const { t: tBookings } = useTranslation('bookings')
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const filters = useMemo(() => ({ ...NO_BOOKING_FILTERS, customerId }), [customerId])

  const { data, isLoading, isError, refetch, isStale } = useBookingPage({
    filters,
    tab: 'All',
    sort: 'newest',
    page,
    pageSize,
  })
  const thumbnails = useVehicleThumbnails()

  if (isLoading && !data) return <LoadingState label={t('bookings.loading')} />
  if (isError || !data) {
    return <ErrorState description={t('bookings.loadError')} onRetry={() => refetch()} />
  }

  const rows = data.items.map((booking) =>
    customerBookingRow(withVehicleImage(booking, thumbnails), [
      {
        label: tBookings('list.rowActions.viewDetails'),
        onClick: () => navigate(`/bookings/${booking[1]}`),
      },
    ]),
  )

  return (
    <div
      className={cn('transition-opacity', isStale && 'pointer-events-none opacity-60')}
      aria-busy={isStale}
    >
      <RecordTable
        title={t('bookings.title')}
        columns={customerBookingColumns(tBookings)}
        rows={rows}
        pagination={{
          page: data.page,
          pageSize,
          total: data.total,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size)
            setPage(1)
          },
        }}
        minWidth="720px"
        onRowClick={(reference) => navigate(`/bookings/${reference}`)}
        emptyState={
          <EmptyState
            icon={CalendarX2}
            title={t('bookings.emptyTitle')}
            description={t('bookings.emptyDescription')}
          />
        }
      />
    </div>
  )
}
