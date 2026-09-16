import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PanelHeading } from '@/components/layout/PanelHeading'
import type { SettingsField, SettingsSectionDef } from '../types/settings.types'

/** Resolves a field's display value — a literal string, or a lookup into the section's own keys. */
function useFieldValue(sectionKey: SettingsSectionDef['key']) {
  const { t } = useTranslation('settings')

  return (value: SettingsField['value']): string =>
    typeof value === 'string'
      ? value
      : t(`sections.${sectionKey}.fields.${value.key}` as never, { count: value.count, defaultValue: value.key })
}

function FieldControl({ field, value, on }: { field: SettingsField; value: string; on: boolean }) {
  if (field.kind === 'input') {
    return (
      <input
        type="text"
        defaultValue={value}
        readOnly
        className="bg-surface-2 border-border focus:border-primary h-9 w-full rounded-[9px] border px-[11px] text-[13px] text-foreground outline-none focus:shadow-[0_0_0_3px_var(--color-tint)]"
      />
    )
  }
  if (field.kind === 'select') {
    return (
      <button
        type="button"
        className="bg-surface-2 border-border hover:bg-surface-3 flex h-9 w-full items-center justify-between gap-2 rounded-[9px] border px-[11px] text-left text-[13px] text-foreground transition-colors"
      >
        <span>{value}</span>
        <ChevronDown className="text-fg-4 size-3.5" />
      </button>
    )
  }
  return (
    <div className="flex h-9 items-center gap-2.5">
      <span
        className="inline-flex h-[21px] w-9 shrink-0 items-center rounded-full p-0.5"
        style={{ background: on ? 'var(--color-primary)' : 'var(--color-border-strong)', justifyContent: on ? 'flex-end' : 'flex-start' }}
      >
        <span className="bg-surface shadow-xs size-[17px] rounded-full" />
      </span>
      <span className="text-fg-2 text-[13px]">{value}</span>
    </div>
  )
}

export function SettingsSection({ section }: { section: SettingsSectionDef }) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const fieldValue = useFieldValue(section.key)

  return (
    <Card as="section" className="overflow-hidden">
      <div className="border-border-soft border-b px-[18px] py-4">
        <PanelHeading title={t(`sections.${section.key}.title`)} description={t(`sections.${section.key}.description`)} />
      </div>

      <div className="grid gap-4 p-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {section.fields.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5" style={{ gridColumn: field.span === 2 ? 'span 2' : undefined }}>
            <label className="text-fg-2 text-[12.5px] font-semibold">
              {t(`sections.${section.key}.fields.${field.key}` as never)}
            </label>
            <FieldControl field={field} value={fieldValue(field.value)} on={field.on ?? false} />
            {field.help && (
              <span className="text-fg-4 text-[11.5px]" style={{ textWrap: 'pretty' }}>
                {t(`sections.${section.key}.fields.${field.key}Help` as never)}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="border-border-soft bg-surface-2 flex justify-end gap-2 border-t px-[18px] py-[13px]">
        <PageActionButton label={tCommon('actions.discard')} />
        <PageActionButton label={tCommon('actions.saveChanges')} variant="solid" />
      </div>
    </Card>
  )
}
