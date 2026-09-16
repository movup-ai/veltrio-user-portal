import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Car, ChevronDown, Download, Gauge, GripVertical, Plus, Tag, Wrench } from 'lucide-react'
import { useDomainLabels } from '@/i18n/domain'
import { useFormatters } from '@/i18n'
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
import { dailyRateOption, vehicleColumns, vehicleRow } from '@/modules/vehicles/utils/vehicle.utils'

/** No bookings API yet — mock data, matched to a vehicle by plate. See VehicleDetailsPage for the same temporary pattern. */
const ALL_BOOKINGS = [...BOOKINGS_UPCOMING, ...BOOKINGS_RECENT]
function tripsForVehicle(v: Vehicle): number {
  return ALL_BOOKINGS.filter((b) => b[3] === v.plate).length
}

/** Canonical values — `All` means "no status filter", the rest map 1:1 to VehicleStatus. */
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
  const { t } = useTranslation('vehicles')
  const { t: tCommon } = useTranslation('common')
  const domain = useDomainLabels()
  const format = useFormatters()
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

  usePageHeaderActions([{ label: t('list.addVehicle'), icon: Plus, onClick: () => navigate('/app/vehicles/new') }], [t])

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
      title: tCommon('filters.applied'),
      description:
        activeCount > 0 ? tCommon('filters.appliedCount', { count: activeCount }) : tCommon('filters.appliedNone'),
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
    {
      icon: Car,
      label: t('list.stats.fleetSize'),
      value: String(fleet.length),
      note: t('list.stats.fleetSizeNote', { count: fleet.filter((v) => v.status === 'Available').length }),
    },
    {
      icon: Gauge,
      label: t('list.stats.utilization'),
      value: fleet.length ? `${Math.round((fleet.reduce((sum, v) => sum + v.utilization, 0) / fleet.length) * 100)}%` : '0%',
      note: t('list.stats.utilizationNote'),
    },
    {
      icon: Wrench,
      label: t('list.stats.inMaintenance'),
      value: String(fleet.filter((v) => v.status === 'Maintenance').length),
      note: t('list.stats.inMaintenanceNote'),
    },
    {
      icon: Tag,
      label: t('list.stats.avgDailyRate'),
      value: avgDailyRate != null ? format.currency(avgDailyRate) : '—',
      note: t('list.stats.avgDailyRateNote'),
    },
  ]

  const items = data?.items ?? []
  const orderedItems = manualOrderMode ? applyManualOrder(items, manualOrder) : items

  const rows = orderedItems.map((v) =>
    vehicleRow(v, tripsForVehicle(v), [
      { label: t('list.rowActions.viewDetails'), onClick: () => navigate(`/app/vehicles/${v.id}`) },
      { label: t('list.rowActions.editVehicle'), onClick: () => navigate(`/app/vehicles/${v.id}/edit`) },
      { label: t('list.rowActions.archiveVehicle'), onClick: () => setDeleteTarget(v), destructive: true },
    ]),
  )

  return (
    <PageContainer>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={<PageActionButton icon={Download} label={t('list.importCsv')} className="!text-[13px]" />}
      />

      <StatStrip stats={stats} />

      <FilterBar
        searchPlaceholder={t('list.searchPlaceholder')}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          resetToFirstPage()
        }}
        filters={[
          {
            label: t('filters.status'),
            value: statusFilter === 'Any' ? tCommon('filters.any') : domain.status(statusFilter),
            options: [
              { value: 'Any', label: tCommon('filters.any') },
              ...VEHICLE_STATUSES.map((s) => ({ value: s, label: domain.status(s) })),
            ],
            onChange: (value) => {
              setStatusFilter(value as VehicleStatus | 'Any')
              setTab('All')
              resetToFirstPage()
            },
          },
          {
            label: t('filters.location'),
            value: locationFilter === 'All' ? tCommon('filters.allCount', { count: LOCATIONS.length }) : locationFilter,
            options: [
              { value: 'All', label: tCommon('filters.all') },
              ...LOCATIONS.map((l) => ({ value: l.name, label: l.name })),
            ],
            onChange: (value) => {
              setLocationFilter(value)
              resetToFirstPage()
            },
          },
          {
            label: t('filters.vehicleType'),
            value: classFilter === 'All' ? tCommon('filters.all') : domain.label('vehicleClass', classFilter),
            options: [
              { value: 'All', label: tCommon('filters.all') },
              ...VEHICLE_CLASSES.map((c) => ({ value: c, label: domain.label('vehicleClass', c) })),
            ],
            onChange: (value) => {
              setClassFilter(value)
              resetToFirstPage()
            },
          },
        ]}
        moreFilters={[
          {
            kind: 'select',
            label: t('filters.transmission'),
            value: draftTransmission === 'Any' ? tCommon('filters.any') : domain.label('transmission', draftTransmission),
            options: [
              { value: 'Any', label: tCommon('filters.any') },
              ...TRANSMISSIONS.map((tr) => ({ value: tr, label: domain.label('transmission', tr) })),
            ],
            onChange: (value) => setDraftTransmission(value as Transmission | 'Any'),
          },
          {
            kind: 'select',
            label: t('filters.fuelType'),
            value: draftFuelType === 'Any' ? tCommon('filters.any') : domain.label('fuelType', draftFuelType),
            options: [
              { value: 'Any', label: tCommon('filters.any') },
              ...FUEL_TYPES.map((f) => ({ value: f, label: domain.label('fuelType', f) })),
            ],
            onChange: (value) => setDraftFuelType(value as FuelType | 'Any'),
          },
          {
            kind: 'checkboxGroup',
            label: t('filters.dailyPrice'),
            options: VEHICLE_PRICE_BANDS.map((b) => ({ label: t(`filters.priceBand.${b.value}`), value: b.value })),
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
        <LoadingState label={t('list.loading')} />
      ) : isError ? (
        <ErrorState description={t('list.loadError')} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Car} title={t('list.emptyTitle')} description={t('list.emptyDescription')} />
      ) : (
        <RecordTable
          tabs={TABS.map((value) => ({
            key: value,
            label: t(`list.tabs.${value}`),
            selected: tab === value,
            onClick: () => {
              setTab(value)
              resetToFirstPage()
            },
          }))}
          columns={vehicleColumns(t)}
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
                      <span className="text-fg-4">{tCommon('filters.sortBy')}</span>
                      <span className="font-semibold">{t(`sort.${sortBy}`)}</span>
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
                        {t(`sort.${s}`)}
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
                {manualOrderMode ? t('list.doneOrdering') : t('list.setOrder')}
              </button>
            </div>
          }
          pageNote={
            manualOrderMode
              ? t('list.dragToReorder', { count: orderedItems.length })
              : data && data.total > 0
                ? t('list.pageNote', {
                    from: (data.page - 1) * PAGE_SIZE + 1,
                    to: Math.min(data.page * PAGE_SIZE, data.total),
                    total: data.total,
                  })
                : t('list.noneFound')
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
        title={t('archiveDialog.title')}
        description={
          deleteTarget
            ? t('archiveDialog.description', {
                name: `${deleteTarget.make} ${deleteTarget.model}`,
                plate: deleteTarget.plate,
              })
            : undefined
        }
        confirmLabel={t('archiveDialog.confirm')}
        loading={deleteVehicle.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteVehicle.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </PageContainer>
  )
}
