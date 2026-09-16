import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Gauge, Plus, Tag, Upload, Wrench } from 'lucide-react'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { StatStrip } from '@/components/data-display/StatStrip'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { usePageHeaderActions } from '@/components/navigation/usePageHeaderActions'
import { LOCATIONS } from '@/modules/locations/mock/location.mock'
import { VEHICLE_CLASSES, VEHICLE_STATUSES, type Vehicle, type VehicleStatus } from '@/modules/vehicles/types/vehicle.types'
import { useDeleteVehicle, useVehicles } from '@/modules/vehicles/hooks/use-vehicles'
import { dailyRateOption, formatCurrency, vehicleColumns, vehicleRow } from '@/modules/vehicles/utils/vehicle.utils'

const TABS = ['All', 'Available', 'On rent', 'Maintenance'] as const
type Tab = (typeof TABS)[number]

const PAGE_SIZE = 5

export function VehiclesPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'Any'>('Any')
  const [locationFilter, setLocationFilter] = useState<string>('All')
  const [classFilter, setClassFilter] = useState<string>('All')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)

  usePageHeaderActions([{ label: 'Add vehicle', icon: Plus, onClick: () => navigate('/app/vehicles/new') }])

  const effectiveStatus: VehicleStatus | 'Any' = tab === 'All' ? statusFilter : (tab as VehicleStatus)

  const listParams = useMemo(
    () => ({
      search: search || undefined,
      status: effectiveStatus,
      location: locationFilter,
      class: classFilter as (typeof VEHICLE_CLASSES)[number] | 'All',
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, effectiveStatus, locationFilter, classFilter, page],
  )

  const { data, isLoading, isError, refetch } = useVehicles(listParams)
  const { data: fleetData } = useVehicles({ page: 1, pageSize: 1000 })
  const deleteVehicle = useDeleteVehicle()

  const resetToFirstPage = () => setPage(1)

  const fleet = fleetData?.items ?? []
  const dailyRates = fleet.map(dailyRateOption).filter((o) => o != null)
  const avgDailyRate = dailyRates.length
    ? Math.round(dailyRates.reduce((sum, o) => sum + o.rate, 0) / dailyRates.length)
    : null

  const stats = [
    { icon: Car, label: 'Fleet size', value: String(fleet.length), note: `${fleet.filter((v) => v.status === 'Available').length} available now` },
    {
      icon: Gauge,
      label: 'Utilization',
      value: fleet.length ? `${Math.round((fleet.reduce((sum, v) => sum + v.utilization, 0) / fleet.length) * 100)}%` : '0%',
      note: 'Target 70%',
    },
    { icon: Wrench, label: 'In maintenance', value: String(fleet.filter((v) => v.status === 'Maintenance').length), note: 'Vehicles currently serviced' },
    {
      icon: Tag,
      label: 'Avg. daily rate',
      value: avgDailyRate != null ? formatCurrency(avgDailyRate) : '—',
      note: 'Across vehicles with a daily rate',
    },
  ]

  const rows = (data?.items ?? []).map((v) =>
    vehicleRow(v, [
      { label: 'View details', onClick: () => navigate(`/app/vehicles/${v.id}`) },
      { label: 'Edit vehicle', onClick: () => navigate(`/app/vehicles/${v.id}/edit`) },
      { label: 'Archive vehicle', onClick: () => setDeleteTarget(v), destructive: true },
    ]),
  )

  return (
    <PageContainer>
      <PageHeader title="Vehicles" description="Manage your rental fleet" actions={<PageActionButton icon={Upload} label="Import CSV" />} />

      <FilterBar
        searchPlaceholder="Search make, model, plate or VIN"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          resetToFirstPage()
        }}
        filters={[
          {
            label: 'Status',
            value: statusFilter,
            options: ['Any', ...VEHICLE_STATUSES],
            onChange: (value) => {
              setStatusFilter(value as VehicleStatus | 'Any')
              setTab('All')
              resetToFirstPage()
            },
          },
          {
            label: 'Location',
            value: locationFilter === 'All' ? `All ${LOCATIONS.length}` : locationFilter,
            options: ['All', ...LOCATIONS.map((l) => l.name)],
            onChange: (value) => {
              setLocationFilter(value)
              resetToFirstPage()
            },
          },
          {
            label: 'Vehicle type',
            value: classFilter,
            options: ['All', ...VEHICLE_CLASSES],
            onChange: (value) => {
              setClassFilter(value)
              resetToFirstPage()
            },
          },
        ]}
      />

      <StatStrip stats={stats} />

      {isLoading && !data ? (
        <LoadingState label="Loading vehicles…" />
      ) : isError ? (
        <ErrorState description="We couldn't load the fleet." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Car} title="No vehicles match your filters" description="Try adjusting the search or filters." />
      ) : (
        <RecordTable
          tabs={TABS.map((t) => ({
            label: t,
            selected: tab === t,
            onClick: () => {
              setTab(t)
              resetToFirstPage()
            },
          }))}
          columns={vehicleColumns()}
          rows={rows}
          rowCountLabel={`${data?.total ?? 0} ${data?.total === 1 ? 'vehicle' : 'vehicles'}`}
          pageNote={
            data && data.total > 0
              ? `Showing ${(data.page - 1) * PAGE_SIZE + 1}–${Math.min(data.page * PAGE_SIZE, data.total)} of ${data.total} vehicles`
              : 'No vehicles found'
          }
          minWidth="880px"
          onRowClick={(id) => navigate(`/app/vehicles/${id}`)}
          pagination={data ? { page: data.page, hasNextPage: data.page < data.totalPages, onPageChange: setPage } : undefined}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Archive vehicle?"
        description={deleteTarget ? `${deleteTarget.make} ${deleteTarget.model} (${deleteTarget.plate}) will be archived and removed from the active fleet. This can't be undone.` : undefined}
        confirmLabel="Archive vehicle"
        loading={deleteVehicle.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteVehicle.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </PageContainer>
  )
}
