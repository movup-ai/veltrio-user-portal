import { Plus } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { usePageHeaderActions } from '@/components/navigation/usePageHeaderActions'
import { LOCATIONS } from '@/modules/locations/mock/location.mock'
import { LocationCard } from '@/modules/locations/components/LocationCard'

export function LocationsPage() {
  usePageHeaderActions([{ label: 'Add location', icon: Plus }])

  return (
    <PageContainer>
      <PageHeader title="Locations" description="Branches, counter hours and on-site fleet" />

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {LOCATIONS.map((location) => (
          <LocationCard key={location.name} location={location} />
        ))}
      </div>
    </PageContainer>
  )
}
