import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PanelHeading } from '@/components/layout/PanelHeading'
import { cn } from '@/lib/utils'

interface SettingsCardProps {
  title: string
  description: string
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>
  onDiscard: () => void
  dirty: boolean
  saving: boolean
  columns?: 1 | 2
  children: React.ReactNode
}

/** A settings section that saves on its own: heading, a field grid, Discard and Save. */
export function SettingsCard({ title, description, onSubmit, onDiscard, dirty, saving, columns = 2, children }: SettingsCardProps) {
  const { t } = useTranslation('common')

  return (
    <Card as="section" className="overflow-hidden">
      <form noValidate onSubmit={(event) => void onSubmit(event)}>
        <div className="border-border-soft border-b px-[18px] py-4">
          <PanelHeading title={title} description={description} />
        </div>

        <div className={cn('grid gap-4 p-[18px]', columns === 2 && 'sm:grid-cols-2')}>{children}</div>

        <div className="border-border-soft bg-surface-2 flex justify-end gap-2 border-t px-[18px] py-[13px]">
          <Button type="button" variant="outline" size="sm" onClick={onDiscard} disabled={!dirty || saving}>
            {t('actions.discard')}
          </Button>
          <Button type="submit" size="sm" loading={saving} disabled={!dirty}>
            {t('actions.saveChanges')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
