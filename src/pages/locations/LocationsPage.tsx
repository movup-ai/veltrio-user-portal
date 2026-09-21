import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { LOCATIONS } from '@/modules/locations/mock/location.mock'
import { LocationCard } from '@/modules/locations/components/LocationCard'

export function LocationsPage() {
  const { t } = useTranslation('locations')


  return (
    <PageContainer>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={<PageActionButton icon={Plus} label={t('list.addLocation')} variant="solid" />}
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {LOCATIONS.map((location) => (
          <LocationCard key={location.name} location={location} />
        ))}
      </div>
    </PageContainer>
  )
}
