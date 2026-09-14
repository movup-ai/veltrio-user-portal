import { ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageActionButton } from '@/components/layout/PageActionButton'
import { PanelHeading } from '@/components/layout/PanelHeading'
import type { SettingsField, SettingsSectionDef } from '../types/settings.types'

function FieldControl({ field }: { field: SettingsField }) {
  if (field.kind === 'input') {
    return (
      <input
        type="text"
        defaultValue={field.value}
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
        <span>{field.value}</span>
        <ChevronDown className="text-fg-4 size-3.5" />
      </button>
    )
  }
  const on = field.value.toLowerCase().startsWith('enabled') || field.value.toLowerCase().startsWith('required')
  return (
    <div className="flex h-9 items-center gap-2.5">
      <span
        className="inline-flex h-[21px] w-9 shrink-0 items-center rounded-full p-0.5"
        style={{ background: on ? 'var(--color-primary)' : 'var(--color-border-strong)', justifyContent: on ? 'flex-end' : 'flex-start' }}
      >
        <span className="bg-surface shadow-xs size-[17px] rounded-full" />
      </span>
      <span className="text-fg-2 text-[13px]">{field.value}</span>
    </div>
  )
}

export function SettingsSection({ section }: { section: SettingsSectionDef }) {
  return (
    <Card as="section" className="overflow-hidden">
      <div className="border-border-soft border-b px-[18px] py-4">
        <PanelHeading title={section.title} description={section.description} />
      </div>

      <div className="grid gap-4 p-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {section.fields.map((field) => (
          <div key={field.label} className="flex flex-col gap-1.5" style={{ gridColumn: field.span === 2 ? 'span 2' : undefined }}>
            <label className="text-fg-2 text-[12.5px] font-semibold">{field.label}</label>
            <FieldControl field={field} />
            {field.help && (
              <span className="text-fg-4 text-[11.5px]" style={{ textWrap: 'pretty' }}>
                {field.help}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="border-border-soft bg-surface-2 flex justify-end gap-2 border-t px-[18px] py-[13px]">
        <PageActionButton label="Discard" />
        <PageActionButton label="Save changes" variant="solid" />
      </div>
    </Card>
  )
}
