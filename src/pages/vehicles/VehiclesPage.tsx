import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Car, ChevronDown, Download, Gauge, GripVertical, Plus, Tag, Wrench } from 'lucide-react'
import { useDomainLabels } from '@/i18n/domain'
import { useFormatters } from '@/i18n'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { cn } from '@/lib/utils'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterBar } from '@/components/data-display/FilterBar'
import { RecordTable } from '@/components/data-display/RecordTable'
import { StatStrip } from '@/components/data-display/StatStrip'
import { Can, usePermissions } from '@/components/feedback/Can'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/use-toast'
import { useLocationNames } from '@/modules/locations/hooks/use-locations'
import { BOOKINGS_RECENT, BOOKINGS_UPCOMING } from '@/modules/bookings/mock/booking.mock'
import {
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_TYPES,
  VEHICLE_PRICE_BANDS,
  VEHICLE_SORTS,
  SELECTABLE_VEHICLE_STATUSES,
  type FuelType,
  type Transmission,
  type Vehicle,
  type VehiclePriceBand,
  type VehicleListParams,
  type VehicleSort,
  type VehicleStatus,
} from '@/modules/vehicles/types/vehicle.types'
import { useArchiveVehicle, useRestoreVehicle, useReorderVehicles, useVehicles, useVehicleStats, vehicleKeys } from '@/modules/vehicles/hooks/use-vehicles'
import { DRAFTS_PAGE, useDeleteVehicleDraft, useVehicleDrafts } from '@/modules/vehicles/hooks/use-vehicle-drafts'
import { hasPermission } from '@/utils/permissions'
import { draftAsVehicle, vehicleColumns, vehicleRow } from '@/modules/vehicles/utils/vehicle.utils'
import { VehicleImportDialog } from '@/modules/vehicles/components/VehicleImportDialog'
import { CopyLinkButton } from '@/modules/vehicles/components/CopyLinkButton'
import { copyToClipboard, fleetUrl, vehicleUrl } from '@/modules/vehicles/utils/public-links'
import { useOrganizationStore } from '@/state/organization.store'

/** No bookings API yet — mock data, matched to a vehicle by plate. See VehicleDetailsPage for the same temporary pattern. */
const ALL_BOOKINGS = [...BOOKINGS_UPCOMING, ...BOOKINGS_RECENT]
function tripsForVehicle(v: Vehicle): number {
  return ALL_BOOKINGS.filter((b) => b[3] === v.plate).length
}

/** Canonical values — `All` means "no status filter", `Drafts` filters on isDraft instead of status, the rest map 1:1 to VehicleStatus. */
const TABS = ['All', 'Available', 'On rent', 'Maintenance', 'Drafts', 'Archived'] as const
type Tab = (typeof TABS)[number]

/** One big page so the filtered set is draggable at once. 100 is the API's ceiling on `limit`. */
const MANUAL_PAGE_SIZE = 100

/**
 * The fleet order lives on the server and is shared across the tenant, so ordering only makes
 * sense over the whole fleet: the API rejects a partial list rather than renumber vehicles the
 * caller never saw. Entering order mode therefore drops the filters and shows everything.
 */
const UNFILTERED: Omit<VehicleListParams, 'page' | 'pageSize' | 'sortBy'> = {
  search: undefined,
  status: 'Any',
  location: 'All',
  vehicleType: 'All',
  transmission: 'Any',
  fuelType: 'Any',
  priceBands: [],
}

export function VehiclesPage() {
  const { t } = useTranslation('vehicles')
  const locations = useLocationNames()
  const { t: tCommon } = useTranslation('common')
  const domain = useDomainLabels()
  const format = useFormatters()
  const navigate = useNavigate()
  const subdomain = useOrganizationStore((s) => s.membership?.subdomain)
  const [tab, setTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'Any'>('Any')
  const [locationFilter, setLocationFilter] = useState<string>('All')
  const [typeFilter, setTypeFilter] = useState<string>('All')
  // Applied values actually feed the query; draft values are what the "More filters" popover
  // edits live — they only become "applied" when Apply filters is clicked.
  const [transmissionFilter, setTransmissionFilter] = useState<Transmission | 'Any'>('Any')
  const [fuelTypeFilter, setFuelTypeFilter] = useState<FuelType | 'Any'>('Any')
  const [priceBands, setPriceBands] = useState<VehiclePriceBand[]>([])
  const [draftTransmission, setDraftTransmission] = useState<Transmission | 'Any'>('Any')
  const [draftFuelType, setDraftFuelType] = useState<FuelType | 'Any'>('Any')
  const [draftPriceBands, setDraftPriceBands] = useState<VehiclePriceBand[]>([])
  const [sortBy, setSortBy] = useState<VehicleSort>('newest')
  const [manualOrderMode, setManualOrderMode] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const isDraftsTab = tab === 'Drafts'
  const effectiveStatus: VehicleStatus | 'Any' = tab === 'All' || isDraftsTab ? statusFilter : (tab as VehicleStatus)

  const listParams = useMemo(
    () =>
      manualOrderMode
        ? // The reorder endpoint takes the whole fleet, so order mode ignores the filters
          // rather than saving an arrangement of whatever happened to be on screen.
          { ...UNFILTERED, sortBy: 'manual' as const, page: 1, pageSize: MANUAL_PAGE_SIZE }
        : {
            search: search || undefined,
            status: effectiveStatus,
            location: locationFilter,
            vehicleType: typeFilter as (typeof VEHICLE_TYPES)[number] | 'All',
            transmission: transmissionFilter,
            fuelType: fuelTypeFilter,
            priceBands,
            sortBy,
            page,
            pageSize,
          },
    [search, effectiveStatus, locationFilter, typeFilter, transmissionFilter, fuelTypeFilter, priceBands, sortBy, manualOrderMode, page, pageSize],
  )

  // Same filters minus the status each tab pins, so a tab's count reflects what it would reveal.
  const tabCountParams = useMemo(() => ({ ...listParams, status: 'Any' as const }), [listParams])

  const { data, isLoading, isError, refetch } = useVehicles(listParams)
  const { data: tabStats } = useVehicleStats(tabCountParams)
  // Unfiltered: the stat cards describe the whole fleet, not the current view.
  const { data: fleetStats } = useVehicleStats({ page: 1, pageSize: DEFAULT_PAGE_SIZE })
  // Drafts are the "add vehicle" wizard, so they follow the same permission as creating one.
  const canAddVehicles = hasPermission(usePermissions(), 'vehicles.create')
  const { data: draftsData } = useVehicleDrafts(DRAFTS_PAGE, canAddVehicles)
  // Its own query: the stats above exclude archived vehicles, so they cannot supply this count.
  const { data: archivedStats } = useVehicleStats({
    ...UNFILTERED,
    status: 'Archived',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  })
  const queryClient = useQueryClient()
  const archiveVehicle = useArchiveVehicle()
  const restoreVehicle = useRestoreVehicle()
  const reorderVehicles = useReorderVehicles()
  const deleteDraft = useDeleteVehicleDraft()

  const drafts = useMemo(() => (draftsData?.items ?? []).map(draftAsVehicle), [draftsData])

  const byStatus = tabStats?.byStatus
  const tabCounts: Record<Tab, number> = {
    All: (statusFilter === 'Any' ? tabStats?.total : byStatus?.[statusFilter]) ?? 0,
    Available: byStatus?.Available ?? 0,
    'On rent': byStatus?.['On rent'] ?? 0,
    Maintenance: byStatus?.Maintenance ?? 0,
    Drafts: draftsData?.total ?? 0,
    Archived: archivedStats?.total ?? 0,
  }

  const visibleTabs = canAddVehicles ? TABS : TABS.filter((value) => value !== 'Drafts')

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

  /** The row menu closes on click, so the copy is confirmed by a toast rather than in place. */
  async function handleCopyVehicleLink(vehicle: Vehicle) {
    if (!subdomain) return
    const url = vehicleUrl(subdomain, vehicle)
    const copied = await copyToClipboard(url)
    toast({
      title: copied ? t('publicLink.copied') : t('publicLink.copyFailed'),
      description: url,
      variant: copied ? 'success' : 'error',
    })
  }

  /**
   * Leaving order mode pins the sort to the arrangement just made — otherwise the list snaps
   * back to whatever it was sorted by before, hiding the order the user came here to set.
   */
  function toggleOrderMode() {
    if (manualOrderMode) {
      setSortBy('manual')
      resetToFirstPage()
    }
    setManualOrderMode(!manualOrderMode)
  }

  function handleReorder(orderedKeys: string[]) {
    // Optimistic: dragging has to feel immediate, and the server returns the same order.
    // The mutation invalidates the list either way, so a rejected save snaps back.
    queryClient.setQueryData(vehicleKeys.list(listParams), (current: unknown) => {
      if (!current || typeof current !== 'object' || !('items' in current)) return current
      const byId = new Map((current.items as Vehicle[]).map((v) => [v.id, v]))
      return { ...current, items: orderedKeys.map((id) => byId.get(id)).filter(Boolean) }
    })
    reorderVehicles.mutate(orderedKeys)
  }

  const stats = [
    {
      icon: Car,
      label: t('list.stats.fleetSize'),
      value: String(fleetStats?.total ?? 0),
      note: t('list.stats.fleetSizeNote', { count: fleetStats?.byStatus.Available ?? 0 }),
    },
    {
      icon: Gauge,
      label: t('list.stats.utilization'),
      value: `${Math.round((fleetStats?.avgUtilization ?? 0) * 100)}%`,
      note: t('list.stats.utilizationNote'),
    },
    {
      icon: Wrench,
      label: t('list.stats.inMaintenance'),
      value: String(fleetStats?.byStatus.Maintenance ?? 0),
      note: t('list.stats.inMaintenanceNote'),
    },
    {
      icon: Tag,
      label: t('list.stats.avgDailyRate'),
      value: fleetStats?.avgDailyRate != null ? format.currency(Math.round(fleetStats.avgDailyRate)) : '—',
      note: t('list.stats.avgDailyRateNote'),
    },
  ]

  // The server sorts; order mode requests sortBy=manual, so the fetched order is the order.
  const orderedItems = isDraftsTab ? drafts : (data?.items ?? [])

  // A draft has no vehicle to open, so its row leads back into the wizard instead.
  const rows = orderedItems.map((v) =>
    v.isDraft
      ? vehicleRow(v, 0, [
          { label: t('list.rowActions.continueDraft'), onClick: () => navigate(`/app/vehicles/new?draft=${v.id}`) },
          { label: t('list.rowActions.discardDraft'), onClick: () => deleteDraft.mutate(v.id), destructive: true },
        ])
      : vehicleRow(v, tripsForVehicle(v), [
          { label: t('list.rowActions.viewDetails'), onClick: () => navigate(`/app/vehicles/${v.id}`) },
          { label: t('list.rowActions.editVehicle'), onClick: () => navigate(`/app/vehicles/${v.id}/edit`) },
          // An archived vehicle has no public page to share, so the link is offered only while live.
          ...(subdomain && v.status !== 'Archived'
            ? [{ label: t('publicLink.vehicleLink'), onClick: () => void handleCopyVehicleLink(v) }]
            : []),
          v.status === 'Archived'
            ? { label: t('list.rowActions.restoreVehicle'), onClick: () => restoreVehicle.mutate(v) }
            : { label: t('list.rowActions.archiveVehicle'), onClick: () => setDeleteTarget(v), destructive: true },
        ]),
  )

  return (
    <PageContainer>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          <>
            {subdomain && (
              <CopyLinkButton
                url={fleetUrl(subdomain)}
                label={t('publicLink.fleetLink')}
                className="!text-[13px]"
              />
            )}
            <Can permission="vehicles.create">
              <PageActionButton
                icon={Download}
                label={t('list.importCsv')}
                onClick={() => setImportOpen(true)}
                className="!text-[13px]"
              />
              <PageActionButton
                icon={Plus}
                label={t('list.addVehicle')}
                variant="solid"
                onClick={() => navigate('/app/vehicles/new')}
                className="!text-[13px]"
              />
            </Can>
          </>
        }
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
              ...SELECTABLE_VEHICLE_STATUSES.map((s) => ({ value: s, label: domain.status(s) })),
            ],
            onChange: (value) => {
              setStatusFilter(value as VehicleStatus | 'Any')
              setTab('All')
              resetToFirstPage()
            },
          },
          {
            label: t('filters.location'),
            // An empty list means "no branches"; a failed load must not look the same.
            value:
              locationFilter !== 'All'
                ? locationFilter
                : locations.isLoading
                  ? tCommon('filters.loading')
                  : locations.isError
                    ? tCommon('filters.unavailable')
                    : tCommon('filters.allCount', { count: locations.names.length }),
            options: [
              { value: 'All', label: tCommon('filters.all') },
              ...locations.names.map((name) => ({ value: name, label: name })),
            ],
            onChange: (value) => {
              setLocationFilter(value)
              resetToFirstPage()
            },
          },
          {
            label: t('filters.vehicleType'),
            value: typeFilter === 'All' ? tCommon('filters.all') : domain.label('vehicleType', typeFilter),
            options: [
              { value: 'All', label: tCommon('filters.all') },
              ...VEHICLE_TYPES.map((c) => ({ value: c, label: domain.label('vehicleType', c) })),
            ],
            onChange: (value) => {
              setTypeFilter(value)
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
      ) : (
        // Rendered even with no rows so the tabs stay reachable — otherwise selecting an empty
        // tab (e.g. "Drafts (0)") would unmount the only way back to a non-empty one.
        <RecordTable
          tabs={visibleTabs.map((value) => ({
            key: value,
            label: t(`list.tabs.${value}`),
            count: tabCounts[value],
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
                onClick={toggleOrderMode}
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
            isDraftsTab
              ? t('list.draftsNote', { count: drafts.length })
              : manualOrderMode
                ? t('list.dragToReorder', { count: orderedItems.length })
                : data && data.total > 0
                  ? undefined
                  : t('list.noneFound')
          }
          minWidth="960px"
          onRowClick={
            manualOrderMode
              ? undefined
              : (id) => navigate(isDraftsTab ? `/app/vehicles/new?draft=${id}` : `/app/vehicles/${id}`)
          }
          pagination={
            // Drafts are capped well under one page, so they never paginate.
            !manualOrderMode && !isDraftsTab && data
              ? {
                  page: data.page,
                  pageSize,
                  total: data.total,
                  onPageChange: setPage,
                  onPageSizeChange: setPageSize,
                }
              : undefined
          }
          reorderable={manualOrderMode && !isDraftsTab}
          onReorder={handleReorder}
          emptyState={<EmptyState icon={Car} title={t('list.emptyTitle')} description={t('list.emptyDescription')} />}
        />
      )}

      <VehicleImportDialog open={importOpen} onOpenChange={setImportOpen} />

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
        loading={archiveVehicle.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          archiveVehicle.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </PageContainer>
  )
}
