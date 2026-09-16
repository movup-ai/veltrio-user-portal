import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { usePageHeaderActions } from '@/components/navigation/usePageHeaderActions'
import { LOCATIONS } from '@/modules/locations/mock/location.mock'
import { LocationCard } from '@/modules/locations/components/LocationCard'

export function LocationsPage() {
  const { t } = useTranslation('locations')

  usePageHeaderActions([{ label: t('list.addLocation'), icon: Plus }], [t])

  return (
    <PageContainer>
      <PageHeader title={t('list.title')} description={t('list.description')} />

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {LOCATIONS.map((location) => (
          <LocationCard key={location.name} location={location} />
        ))}
      </div>
    </PageContainer>
  )
}
