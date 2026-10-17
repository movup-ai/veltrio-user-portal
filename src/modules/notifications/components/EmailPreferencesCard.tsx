import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Switch } from '@/components/ui/switch'
import { SettingsCard } from '@/modules/settings/components/SettingsCard'
import { useMe } from '@/services/auth/use-me'
import { useEmailPreferences, useSaveEmailPreferences } from '../hooks/use-notifications'
import type { EmailPreference } from '../types/notifications.types'

/** Each member's own email switches. The portal itself always shows everything. */
export function EmailPreferencesCard() {
  const { data, isLoading, isError, refetch } = useEmailPreferences()
  if (isLoading) return <LoadingState />
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />
  // Keyed on what was saved, so a save that comes back starts the form again from it.
  return <PreferencesForm key={JSON.stringify(data)} saved={data} />
}

function PreferencesForm({ saved }: { saved: EmailPreference[] }) {
  const { t } = useTranslation('notifications')
  const email = useMe().data?.user.email
  const save = useSaveEmailPreferences()
  const [draft, setDraft] = useState(saved)
  const dirty = draft.some((preference, index) => preference.email !== saved[index]?.email)

  return (
    <SettingsCard
      title={t('settings.cardTitle')}
      description={t('settings.cardDescription', { email: email ?? '' })}
      columns={1}
      dirty={dirty}
      saving={save.isPending}
      onDiscard={() => setDraft(saved)}
      onSubmit={async (event) => {
        event?.preventDefault()
        await save.mutateAsync(draft).catch(() => undefined)
      }}
    >
      {draft.map((preference) => {
        const id = `email-${preference.category}`
        return (
          <div key={preference.category} className="flex items-start justify-between gap-4">
            <label htmlFor={id} className="min-w-0">
              <span className="text-foreground block text-[13.5px] font-semibold">
                {t(`settings.categories.${preference.category}.label`)}
              </span>
              <span className="text-fg-3 block text-[12.5px]">
                {t(`settings.categories.${preference.category}.description`)}
              </span>
            </label>
            <Switch
              id={id}
              checked={preference.email}
              onCheckedChange={(checked) =>
                setDraft((current) =>
                  current.map((item) =>
                    item.category === preference.category ? { ...item, email: checked } : item,
                  ),
                )
              }
            />
          </div>
        )
      })}
      <p className="text-fg-4 m-0 text-[12px]">{t('settings.always')}</p>
    </SettingsCard>
  )
}
