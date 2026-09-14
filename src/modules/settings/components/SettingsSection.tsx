import { ChevronDown } from 'lucide-react'
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
    <section className="bg-surface border-border shadow-xs overflow-hidden rounded-xl border">
      <div className="border-border-soft border-b px-[18px] py-4">
        <h2 className="m-0 text-[14.5px] font-semibold">{section.title}</h2>
        <p className="text-fg-4 m-0 mt-[3px] text-[12.5px]" style={{ textWrap: 'pretty' }}>
          {section.description}
        </p>
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
        <button type="button" className="bg-surface border-border text-fg-2 hover:bg-surface-3 h-[34px] rounded-[9px] border px-[13px] text-[12.5px] font-semibold transition-colors">
          Discard
        </button>
        <button type="button" className="bg-primary text-primary-foreground hover:bg-primary-hover h-[34px] rounded-[9px] px-[13px] text-[12.5px] font-semibold transition-colors">
          Save changes
        </button>
      </div>
    </section>
  )
}
