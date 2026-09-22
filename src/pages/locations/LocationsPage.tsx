import { useState } from 'react'
import { MapPin, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { LocationCard } from '@/modules/locations/components/LocationCard'
import { LocationDialog } from '@/modules/locations/components/LocationDialog'
import { useDeleteLocation, useLocations } from '@/modules/locations/hooks/use-locations'
import type { Location } from '@/modules/locations/types/location.types'

export function LocationsPage() {
  const { t } = useTranslation('locations')
  const { data: locations, isLoading, isError, refetch } = useLocations('newest')
  const deleteLocation = useDeleteLocation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Location | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)
  // The API refuses to delete a branch that still has vehicles, so the dialog explains the
  // blocker and withholds the action rather than sending a request that cannot succeed.
  const deleteBlocked = Boolean(deleteTarget && deleteTarget.vehicleCount > 0)

  const openAdd = () => {
    setEditing(undefined)
    setDialogOpen(true)
  }

  const openEdit = (location: Location) => {
    setEditing(location)
    setDialogOpen(true)
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          <PageActionButton
            icon={Plus}
            label={t('list.addLocation')}
            variant="solid"
            onClick={openAdd}
          />
        }
      />

      {isLoading ? (
        <LoadingState label={t('list.loading')} />
      ) : isError ? (
        <ErrorState
          title={t('list.errorTitle')}
          description={t('list.errorDescription')}
          onRetry={() => refetch()}
        />
      ) : locations && locations.length > 0 ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onEdit={() => openEdit(location)}
              onDelete={() => setDeleteTarget(location)}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <MapPin className="text-fg-4 mx-auto size-8" />
          <p className="m-0 mt-3 text-[15px] font-semibold">{t('list.emptyTitle')}</p>
          <p className="text-fg-3 m-0 mt-1 text-[13px]">{t('list.emptyDescription')}</p>
        </div>
      )}

      <LocationDialog location={editing} open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('confirmDelete.title')}
        description={
          deleteTarget?.vehicleCount
            ? t('confirmDelete.inUse', { count: deleteTarget.vehicleCount })
            : t('confirmDelete.description', { name: deleteTarget?.name ?? '' })
        }
        confirmLabel={t('confirmDelete.confirm')}
        loading={deleteLocation.isPending}
        confirmDisabled={deleteBlocked}
        onConfirm={() => {
          if (deleteTarget && !deleteBlocked) {
            deleteLocation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
      />
    </PageContainer>
  )
}
