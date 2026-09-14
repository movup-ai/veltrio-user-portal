export type SettingsFieldKind = 'input' | 'select' | 'toggle'

export interface SettingsField {
  label: string
  value: string
  kind: SettingsFieldKind
  span?: 1 | 2
  help?: string
}

export interface SettingsSectionDef {
  title: string
  description: string
  fields: SettingsField[]
}
