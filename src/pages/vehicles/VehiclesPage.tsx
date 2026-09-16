import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, ChevronDown, Download, Gauge, GripVertical, Plus, Tag, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/use-toast'
import { LOCATIONS } from '@/modules/locations/mock/location.mock'
import { BOOKINGS_RECENT, BOOKINGS_UPCOMING } from '@/modules/bookings/mock/booking.mock'
import {
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CLASSES,
  VEHICLE_PRICE_BANDS,
  VEHICLE_SORT_LABELS,
  VEHICLE_SORTS,
  VEHICLE_STATUSES,
  type FuelType,
  type Transmission,
  type Vehicle,
  type VehiclePriceBand,
  type VehicleSort,
  type VehicleStatus,
} from '@/modules/vehicles/types/vehicle.types'
import { useDeleteVehicle, useVehicles } from '@/modules/vehicles/hooks/use-vehicles'
import { dailyRateOption, formatCurrency, vehicleColumns, vehicleRow } from '@/modules/vehicles/utils/vehicle.utils'

/** No bookings API yet — mock data, matched to a vehicle by plate. See VehicleDetailsPage for the same temporary pattern. */
const ALL_BOOKINGS = [...BOOKINGS_UPCOMING, ...BOOKINGS_RECENT]
function tripsForVehicle(v: Vehicle): number {
  return ALL_BOOKINGS.filter((b) => b[3] === v.plate).length
}

const TABS = ['All', 'Available', 'On rent', 'Maintenance'] as const
type Tab = (typeof TABS)[number]

const PAGE_SIZE = 8
/** A large single "page" so the whole filtered set is draggable at once while manually ordered. */
const MANUAL_PAGE_SIZE = 500

const MANUAL_ORDER_STORAGE_KEY = 'veltrio.vehicleManualOrder'

function loadManualOrder(): string[] {
  try {
    const raw = localStorage.getItem(MANUAL_ORDER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Known ids keep the saved order; anything new (or outside the current filters) falls in after, in fetch order. */
function applyManualOrder(items: Vehicle[], order: string[]): Vehicle[] {
  const known = items.filter((v) => order.includes(v.id)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  const unknown = items.filter((v) => !order.includes(v.id))
  return [...known, ...unknown]
}

export function VehiclesPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'Any'>('Any')
  const [locationFilter, setLocationFilter] = useState<string>('All')
  const [classFilter, setClassFilter] = useState<string>('All')
  // Applied values actually feed the query; draft values are what the "More filters" popover
  // edits live — they only become "applied" when Apply filters is clicked.
  const [transmissionFilter, setTransmissionFilter] = useState<Transmission | 'Any'>('Any')
  const [fuelTypeFilter, setFuelTypeFilter] = useState<FuelType | 'Any'>('Any')
  const [priceBands, setPriceBands] = useState<VehiclePriceBand[]>([])
  const [draftTransmission, setDraftTransmission] = useState<Transmission | 'Any'>('Any')
  const [draftFuelType, setDraftFuelType] = useState<FuelType | 'Any'>('Any')
  const [draftPriceBands, setDraftPriceBands] = useState<VehiclePriceBand[]>([])
  const [sortBy, setSortBy] = useState<VehicleSort>('utilization')
  const [manualOrderMode, setManualOrderMode] = useState(false)
  const [manualOrder, setManualOrder] = useState<string[]>(loadManualOrder)
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
      transmission: transmissionFilter,
      fuelType: fuelTypeFilter,
      priceBands,
      sortBy,
      page: manualOrderMode ? 1 : page,
      pageSize: manualOrderMode ? MANUAL_PAGE_SIZE : PAGE_SIZE,
    }),
    [search, effectiveStatus, locationFilter, classFilter, transmissionFilter, fuelTypeFilter, priceBands, sortBy, manualOrderMode, page],
  )

  const { data, isLoading, isError, refetch } = useVehicles(listParams)
  const { data: fleetData } = useVehicles({ page: 1, pageSize: 1000 })
  const deleteVehicle = useDeleteVehicle()

  const resetToFirstPage = () => setPage(1)

  function toggleDraftPriceBand(value: string) {
    setDraftPriceBands((prev) => (prev.includes(value as VehiclePriceBand) ? prev.filter((b) => b !== value) : [...prev, value as VehiclePriceBand]))
  }

  /** Popover just opened — discard any unapplied edits from last time by resetting drafts to what's actually applied. */
  function handleOpenMoreFilters() {
    setDraftTransmission(transmissionFilter)
    setDraftFuelType(fuelTypeFilter)
    setDraftPriceBands(priceBands)
  }

  function handleApplyFilters() {
    setTransmissionFilter(draftTransmission)
    setFuelTypeFilter(draftFuelType)
    setPriceBands(draftPriceBands)
    resetToFirstPage()
    const activeCount = (draftTransmission !== 'Any' ? 1 : 0) + (draftFuelType !== 'Any' ? 1 : 0) + (draftPriceBands.length > 0 ? 1 : 0)
    toast({
      title: 'Filters applied',
      description: activeCount > 0 ? `${activeCount} filter${activeCount === 1 ? '' : 's'} applied to the results.` : 'No extra filters selected.',
      variant: 'success',
    })
  }

  function handleReorder(orderedKeys: string[]) {
    setManualOrder(orderedKeys)
    localStorage.setItem(MANUAL_ORDER_STORAGE_KEY, JSON.stringify(orderedKeys))
  }

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

  const items = data?.items ?? []
  const orderedItems = manualOrderMode ? applyManualOrder(items, manualOrder) : items

  const rows = orderedItems.map((v) =>
    vehicleRow(v, tripsForVehicle(v), [
      { label: 'View details', onClick: () => navigate(`/app/vehicles/${v.id}`) },
      { label: 'Edit vehicle', onClick: () => navigate(`/app/vehicles/${v.id}/edit`) },
      { label: 'Archive vehicle', onClick: () => setDeleteTarget(v), destructive: true },
    ]),
  )

  return (
    <PageContainer>
      <PageHeader
        title="Vehicles"
        description="Manage your rental fleet"
        actions={<PageActionButton icon={Download} label="Import CSV" className="!text-[13px]" />}
      />

      <StatStrip stats={stats} />

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
        moreFilters={[
          {
            kind: 'select',
            label: 'Transmission',
            value: draftTransmission,
            options: ['Any', ...TRANSMISSIONS],
            onChange: (value) => setDraftTransmission(value as Transmission | 'Any'),
          },
          {
            kind: 'select',
            label: 'Fuel type',
            value: draftFuelType,
            options: ['Any', ...FUEL_TYPES],
            onChange: (value) => setDraftFuelType(value as FuelType | 'Any'),
          },
          {
            kind: 'checkboxGroup',
            label: 'Daily price',
            options: VEHICLE_PRICE_BANDS.map((b) => ({ label: b.label, value: b.value })),
            selected: draftPriceBands,
            onToggle: toggleDraftPriceBand,
          },
        ]}
        moreFiltersActiveCount={(transmissionFilter !== 'Any' ? 1 : 0) + (fuelTypeFilter !== 'Any' ? 1 : 0) + (priceBands.length > 0 ? 1 : 0)}
        onClearMoreFilters={() => {
          setTransmissionFilter('Any')
          setFuelTypeFilter('Any')
          setPriceBands([])
          setDraftTransmission('Any')
          setDraftFuelType('Any')
          setDraftPriceBands([])
          resetToFirstPage()
        }}
        onApplyFilters={handleApplyFilters}
        onOpenMoreFilters={handleOpenMoreFilters}
      />

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
          actions={
            <div className="flex items-center gap-2">
              {!manualOrderMode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground flex h-8 shrink-0 items-center gap-2 rounded-[9px] border px-[11px] text-[12.5px] whitespace-nowrap transition-colors"
                    >
                      <span className="text-fg-4">Sort by</span>
                      <span className="font-semibold">{VEHICLE_SORT_LABELS[sortBy]}</span>
                      <ChevronDown className="text-fg-4 size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {VEHICLE_SORTS.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onSelect={() => {
                          setSortBy(s)
                          resetToFirstPage()
                        }}
                      >
                        {VEHICLE_SORT_LABELS[s]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <button
                type="button"
                onClick={() => setManualOrderMode((v) => !v)}
                className={cn(
                  'flex h-8 shrink-0 items-center gap-2 rounded-[9px] border px-[11px] text-[12.5px] font-semibold whitespace-nowrap transition-colors',
                  manualOrderMode
                    ? 'bg-tint border-primary text-primary'
                    : 'bg-surface border-border text-fg-2 hover:bg-surface-3 hover:text-foreground',
                )}
              >
                <GripVertical className="size-3.5" />
                {manualOrderMode ? 'Done ordering' : 'Set vehicle order'}
              </button>
            </div>
          }
          pageNote={
            manualOrderMode
              ? `${orderedItems.length} ${orderedItems.length === 1 ? 'vehicle' : 'vehicles'} · drag to reorder`
              : data && data.total > 0
                ? `Showing ${(data.page - 1) * PAGE_SIZE + 1}–${Math.min(data.page * PAGE_SIZE, data.total)} of ${data.total} vehicles`
                : 'No vehicles found'
          }
          minWidth="960px"
          onRowClick={manualOrderMode ? undefined : (id) => navigate(`/app/vehicles/${id}`)}
          pagination={!manualOrderMode && data ? { page: data.page, hasNextPage: data.page < data.totalPages, onPageChange: setPage } : undefined}
          reorderable={manualOrderMode}
          onReorder={handleReorder}
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
